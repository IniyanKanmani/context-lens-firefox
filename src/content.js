browser.runtime.onMessage.addListener((message, _, __) => {
  if (message.type === "SER_QUICK_EXPLAIN_KEY_TRIGGERED") {
    handleTextExplainTrigger("quick-explain");
  } else if (message.type === "SER_CONTEXTUAL_EXPLAIN_KEY_TRIGGERED") {
    handleTextExplainTrigger("contextual-explain");
  } else if (message.type === "SER_LLM_REQUEST_SUCCESS") {
    handleLLMRequestSuccess(message.popupId);
  } else if (message.type === "SER_LLM_REQUEST_FAILURE") {
    handleLLMRequestFailure(message.popupId);
  } else if (message.type === "SER_LLM_STREAM_CHUNK") {
    handleLLMStreamChunk(message.popupId, message.content);
  } else if (message.type === "SER_LLM_STREAM_CANCELED") {
    removePopup(message.popupId);
  } else if (message.type === "SER_LLM_STREAM_CLOSED") {
    handleLLMStreamClosed(message.popupId);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (isLastRequestBeingProcessed()) {
      cancelOrCloseLastPopup();
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
    if (isLastRequestBeingProcessed()) {
      cancelOrCloseLastPopup();
    }

    removeAllPopups();
  } else if (elementId.startsWith("popup-")) {
    const popupId = parseInt(elementId.split("-")[1]);

    if (popupId !== popupCounter && isLastRequestBeingProcessed()) {
      cancelOrCloseLastPopup();
    }

    removeBranchPopups(popupId);
  }
});

function handleTextExplainTrigger(type) {
  if (isLastRequestBeingProcessed()) {
    return;
  }

  const selection = window.getSelection();

  if (!selection || selection.toString().trim() === "") {
    return;
  }

  const popupId = ++popupCounter;
  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();

  if (type === "quick-explain") {
    createQuickExplainPopup(popupId, range, selectedText);
  } else if (type === "contextual-explain") {
    createContextualExplainPopup(popupId, range, selectedText);
  }
}

function isLastRequestBeingProcessed() {
  const popup = popups.get(popupCounter);

  if (!popup) {
    return false;
  }

  return popup.isBeingProcessed;
}

function cancelOrCloseLastPopup() {
  const popup = popups.get(popupCounter);

  if (!popup) {
    return;
  }

  if (!popup.isBeingProcessed) {
    return;
  }

  if (popup.type === "quick-explain") {
    sendMessage("WEB_CANCEL_STREAM", popupCounter, null, null);
  } else if (popup.type === "contextual-explain") {
    if (!popup.gotContextInput) {
      removePopup(popupCounter);
    } else {
      sendMessage("WEB_CANCEL_STREAM", popupCounter, null, null);
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
