function handleLLMRequestSuccess(popupId) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  const targetElement =
    popup.type === "image-explain" ? popup.responsePopup : popup.element;
  targetElement.textContent = "Generating...";
}

function handleLLMRequestFailure(popupId) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  const targetElement =
    popup.type === "image-explain" ? popup.responsePopup : popup.element;
  targetElement.classList.remove("loading");
  targetElement.textContent = "Request failed. Please retry...";

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

  const targetElement =
    popup.type === "image-explain" ? popup.responsePopup : popup.element;

  if (!popup.hasReceivedFirstToken) {
    targetElement.classList.remove("loading");
    popup.hasReceivedFirstToken = true;
    popup.content = "";
  }

  popup.content += content;
  targetElement.textContent = popup.content;
}

function handleLLMStreamClosed(popupId) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  const targetElement =
    popup.type === "image-explain" ? popup.responsePopup : popup.element;

  setTimeout(() => {
    targetElement.classList.add("complete");

    setTimeout(() => {
      targetElement.classList.remove("complete");
      popup.isBeingProcessed = false;
    }, 750);
  }, 250);
}
