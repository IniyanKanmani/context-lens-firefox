function handleLLMRequestSuccess(popupId) {
  const popupData = popups.get(popupId);

  if (!popupData) {
    return;
  }

  popupData.element.textContent = "Generating...";
}

function handleLLMRequestFailure(popupId) {
  const popupData = popups.get(popupId);

  if (!popupData) {
    return;
  }

  popupData.element.classList.remove("loading");
  popupData.element.textContent = "Request failed. Please retry...";

  setTimeout(() => {
    popupData.element.remove();
    popups.delete(popupId);
    popupData.isBeingProcessed = false;
  }, 3000);
}

function handleLLMStreamChunk(popupId, content) {
  const popupData = popups.get(popupId);

  if (!popupData) {
    return;
  }

  if (!popupData.hasReceivedFirstToken && content.includes("\n")) {
    return;
  }

  if (!popupData.hasReceivedFirstToken) {
    popupData.element.classList.remove("loading");
    popupData.hasReceivedFirstToken = true;
  }

  popupData.content += content;
  popupData.element.textContent = popupData.content;
}

function handleLLMStreamClosed(popupId) {
  const popupData = popups.get(popupId);

  if (!popupData) {
    return;
  }

  setTimeout(() => {
    popupData.element.classList.add("complete");
    setTimeout(() => {
      popupData.element.classList.remove("complete");
      popupData.isBeingProcessed = false;
    }, 750);
  }, 250);
}
