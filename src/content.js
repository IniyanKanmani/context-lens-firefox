browser.runtime.onMessage.addListener((message, _, __) => {
  if (message.type === "SER_QUICK_EXPLAIN_KEY_TRIGGERED") {
    handleTextExplainTrigger("quick-explain");
  } else if (message.type === "SER_CONTEXTUAL_EXPLAIN_KEY_TRIGGERED") {
    handleTextExplainTrigger("contextual-explain");
  } else if (message.type === "SER_VISUAL_EXPLAIN_KEY_TRIGGERED") {
    handleVisualExplainTrigger("visual-explain", message.imageUri);
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
    const lastPopup = popups.get(popupCounter);

    if (!lastPopup) {
      return;
    }

    if (lastPopup.isBeingProcessed) {
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

  const lastPopup = popups.get(popupCounter);

  if (!lastPopup) {
    return;
  }

  if (!isInsidePopup) {
    if (lastPopup.isBeingProcessed) {
      cancelOrCloseLastPopup();
    }

    removeAllPopups();

    return;
  }

  if (lastPopup.type !== "visual-explain") {
    const popupId = parseInt(elementId.split("-")[1]);

    if (popupId !== popupCounter && lastPopup.isBeingProcessed) {
      cancelOrCloseLastPopup();
    }

    removeBranchPopups(popupId);

    return;
  }

  if (
    lastPopup.isBeingProcessed &&
    !lastPopup.isSelectionMade &&
    !lastPopup.isMouseDown
  ) {
    lastPopup.startVisualSelection(event.clientX, event.clientY);
  }
});

document.addEventListener("mousemove", (event) => {
  const lastPopup = popups.get(popupCounter);

  if (!lastPopup) {
    return;
  }

  if (
    lastPopup.type === "visual-explain" &&
    lastPopup.isBeingProcessed &&
    lastPopup.isMouseDown
  ) {
    lastPopup.updateVisualSelection(event.clientX, event.clientY);
  }
});

document.addEventListener("mouseup", (event) => {
  const lastPopup = popups.get(popupCounter);

  if (!lastPopup) {
    return;
  }

  if (
    lastPopup.type === "visual-explain" &&
    lastPopup.isBeingProcessed &&
    lastPopup.isMouseDown
  ) {
    lastPopup.stopVisualSelection(event.clientX, event.clientY);
  }
});

function handleTextExplainTrigger(type) {
  const lastPopup = popups.get(popupCounter);

  if (lastPopup && lastPopup.isBeingProcessed) {
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
    const popup = new QuickExplainPopup(popupId);

    popup.create(range, selectedText);
    popups.set(popupId, popup);
  } else if (type === "contextual-explain") {
    const popup = new ContextualExplainPopup(popupId);

    popup.create(range, selectedText);
    popups.set(popupId, popup);
  }
}

async function handleVisualExplainTrigger(type, imageUri) {
  const lastPopup = popups.get(popupCounter);

  if (lastPopup && lastPopup.isBeingProcessed) {
    return;
  }

  const popupId = ++popupCounter;

  if (type === "visual-explain") {
    const popup = new VisualExplainPopup(popupId);
    popup.create(imageUri);
    popups.set(popupId, popup);
  }
}

function cancelOrCloseLastPopup() {
  const lastPopup = popups.get(popupCounter);

  if (lastPopup && !lastPopup.isBeingProcessed) {
    return;
  }

  if (lastPopup.type === "quick-explain") {
    sendMessage("WEB_CANCEL_STREAM", popupCounter, null, null);
  } else if (lastPopup.type === "contextual-explain") {
    if (!lastPopup.gotContextInput) {
      removePopup(popupCounter);
    } else {
      sendMessage("WEB_CANCEL_STREAM", popupCounter, null, null);
    }
  } else if (lastPopup.type === "visual-explain") {
    if (lastPopup.isSelectionMade) {
      lastPopup.removeVisualSelection();
    } else if (lastPopup.isMouseDown) {
      lastPopup.stopVisualSelection();
      lastPopup.removeVisualSelection();
    } else {
      removePopup(popupCounter);
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
