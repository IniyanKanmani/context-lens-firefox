let isProcessingRequest = false;

browser.runtime.onMessage.addListener((message, _, __) => {
  if (message.type === "SER_TEXT_GEN_KEY_TRIGGERED") {
    handleTextGenTrigger();
  } else if (message.type === "SER_LLM_REQUEST_SUCCESS") {
    handleLLMRequestSuccess(message.popupId);
  } else if (message.type === "SER_LLM_REQUEST_FAILURE") {
    handleLLMRequestFailure(message.popupId);
    isProcessingRequest = false;
  } else if (message.type === "SER_LLM_STREAM_CHUNK") {
    handleLLMStreamChunk(message.popupId, message.content);
  } else if (message.type === "SER_LLM_STREAM_CANCELED") {
    removePopup(message.popupId);
    isProcessingRequest = false;
  } else if (message.type === "SER_LLM_STREAM_CLOSED") {
    handleLLMStreamClosed(message.popupId);
    isProcessingRequest = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (isProcessingRequest) {
      sendMessage("WEB_CANCEL_STREAM", popupCounter, null);
    } else {
      removeAllPopups();
    }
  }
});

document.addEventListener("mousedown", (event) => {
  const clickedElement = event.target;
  const isInsidePopup = clickedElement.closest(".context-lens-popup");
  const elementId = clickedElement.id;

  if (!isInsidePopup) {
    removeAllPopups();
  } else if (elementId.startsWith("popup-")) {
    const popupId = parseInt(elementId.split("-")[1]);
    removeBranchPopups(popupId);
  }
});

function handleTextGenTrigger() {
  if (!isProcessingRequest) {
    const textSelection = document.getSelection();

    if (textSelection && textSelection.toString().trim() !== "") {
      const range = textSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const popupId = ++popupCounter;
      createPopup(popupId, rect);

      isProcessingRequest = true;
      sendMessage("WEB_TEXT_GEN", popupId, textSelection.toString().trim());
    }
  }
}

function sendMessage(type, popupId, content) {
  browser.runtime.sendMessage({
    type: type,
    popupId: popupId,
    content: content,
  });
}
