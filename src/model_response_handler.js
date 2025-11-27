function handleLLMRequestSuccess(popupId) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  popup.element.textContent = "Generating...";
}

function handleLLMRequestFailure(popupId) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  popup.element.classList.remove("loading");
  popup.element.textContent = "Request failed. Please retry...";

  setTimeout(() => {
    popup.remove();
    popup.isBeingProcessed = false;
    popups.delete(popupId);
  }, 3000);
}

function handleLLMStreamChunk(popupId, content) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  if (!popup.hasReceivedFirstToken && content.includes("\n")) {
    return;
  }

  if (!popup.hasReceivedFirstToken) {
    popup.element.classList.remove("loading");
    popup.hasReceivedFirstToken = true;
    popup.content = "";
  }

  popup.content += content;
  popup.element.textContent = popup.content;
}

function handleLLMStreamClosed(popupId) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  setTimeout(() => {
    popup.element.classList.add("complete");

    setTimeout(() => {
      popup.element.classList.remove("complete");
      popup.isBeingProcessed = false;
    }, 750);
  }, 250);
}
