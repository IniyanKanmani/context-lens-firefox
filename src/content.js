let isProcessingRequest = false;

browser.runtime.onMessage.addListener((message, _, __) => {
  if (message.type === "SER_QUICK_EXPLAIN_KEY_TRIGGERED") {
    handleQuickExplainTrigger();
  } else if (message.type === "SER_CONTEXTUAL_EXPLAIN_KEY_TRIGGERED") {
    handleContextualExplainTrigger();
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
    if (isProcessingRequest) {
      sendMessage("WEB_CANCEL_STREAM", popupCounter, null);
    }

    removeAllPopups();
  } else if (elementId.startsWith("popup-")) {
    const popupId = parseInt(elementId.split("-")[1]);

    if (popupId !== popupCounter && isProcessingRequest) {
      sendMessage("WEB_CANCEL_STREAM", popupCounter, null);
    }

    removeBranchPopups(popupId);
  }
});

function handleQuickExplainTrigger() {
  if (!isProcessingRequest) {
    const textSelection = document.getSelection();

    if (textSelection && textSelection.toString().trim() !== "") {
      const range = textSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const popupId = ++popupCounter;
      createQuickExplainPopup(popupId, rect);

      isProcessingRequest = true;
      sendMessage(
        "WEB_QUICK_EXPLAIN",
        popupId,
        textSelection.toString().trim(),
      );
    }
  }
}

function handleContextualExplainTrigger() {
  if (!isProcessingRequest) {
    const textSelection = document.getSelection();

    if (textSelection && textSelection.toString().trim() !== "") {
      const range = textSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const popupId = ++popupCounter;
      const selectedText = textSelection.toString().trim();
      createContextualExplainPopup(popupId, rect, selectedText);

      isProcessingRequest = true;
    }
  }
}

function sendMessage(type, popupId, selectedText, additionalContext) {
  browser.runtime.sendMessage({
    type: type,
    popupId: popupId,
    selectedText: selectedText,
    additionalContext: additionalContext,
  });
}
