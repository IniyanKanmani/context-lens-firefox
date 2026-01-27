const link = document.createElement("link");
link.rel = "stylesheet";
link.href = browser.runtime.getURL("src/popup.css");
document.head.appendChild(link);

const popups = new Popups();

browser.runtime.onMessage.addListener((message, _, __) => {
  if (message.type === "SER_QUICK_EXPLAIN_KEY_TRIGGERED") {
    handleTextExplainTrigger("quick-explain");
  } else if (message.type === "SER_CONTEXTUAL_EXPLAIN_KEY_TRIGGERED") {
    handleTextExplainTrigger("contextual-explain");
  } else if (message.type === "SER_IMAGE_EXPLAIN_KEY_TRIGGERED") {
    handleImageExplainTrigger("image-explain", message.imageUri);
  } else if (message.type === "SER_LLM_REQUEST_SUCCESS") {
    handleLLMRequestSuccess(message.popupId);
  } else if (message.type === "SER_LLM_REQUEST_FAILURE") {
    handleLLMRequestFailure(message.popupId);
  } else if (message.type === "SER_LLM_STREAM_CHUNK") {
    handleLLMStreamChunk(message.popupId, message.content);
  } else if (message.type === "SER_LLM_STREAM_CANCELED") {
    handleLLMStreamCancel(message.popupId);
  } else if (message.type === "SER_LLM_STREAM_CLOSED") {
    handleLLMStreamClosed(message.popupId);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const lastPopup = popups.getLastPopup();

    if (!lastPopup) {
      return;
    }

    if (lastPopup.isBeingProcessed) {
      popups.cancelOrCloseLastPopup();
    } else {
      popups.removeAllPopupsUntillLastBasePopup();
    }
  } else if (event.key === "Enter") {
    const lastPopup = popups.getLastPopup();

    if (!lastPopup) {
      return;
    }

    if (
      lastPopup.type === "image-explain" &&
      lastPopup.isBeingProcessed &&
      lastPopup.isSelectionMade &&
      !lastPopup.isBeingInfered
    ) {
      lastPopup.cropImageAndInfer();
    }
  }
});

document.addEventListener("mousedown", (event) => {
  const clickedElement = event.target;
  const isInsidePopup = clickedElement.closest(".context-lens");
  const elementId = clickedElement.id;

  const lastPopup = popups.getLastPopup();

  if (!lastPopup) {
    return;
  }

  if (!isInsidePopup) {
    if (lastPopup.isBeingProcessed) {
      popups.cancelOrCloseLastPopup();
    }

    popups.removeAllPopupsUntillLastBasePopup();

    return;
  }

  if (
    isInsidePopup &&
    lastPopup.type !== "image-explain" &&
    elementId.startsWith("text-popup-")
  ) {
    const popupId = parseInt(elementId.split("-")[2]);

    if (popupId !== popups.counter && lastPopup.isBeingProcessed) {
      popups.cancelOrCloseLastPopup();
    }

    popups.removeBranchPopups(popupId);

    return;
  }

  if (
    isInsidePopup &&
    lastPopup.type !== "image-explain" &&
    elementId.startsWith("image-popup-")
  ) {
    const popupId = parseInt(elementId.split("-")[2]);

    if (popupId !== popups.counter && lastPopup.isBeingProcessed) {
      popups.cancelOrCloseLastPopup();
    }

    popups.removeBranchPopups(popupId);

    return;
  }

  if (isInsidePopup && lastPopup.type === "image-explain") {
    if (
      lastPopup.isBeingProcessed &&
      !lastPopup.isMouseDown &&
      !lastPopup.isSelectionMade
    ) {
      lastPopup.startVisualSelection(event.clientX, event.clientY);

      return;
    }
  }
});

document.addEventListener("mousemove", (event) => {
  const lastPopup = popups.getLastPopup();

  if (!lastPopup) {
    return;
  }

  if (
    lastPopup.type === "image-explain" &&
    lastPopup.isBeingProcessed &&
    lastPopup.isMouseDown &&
    !lastPopup.isSelectionMade
  ) {
    lastPopup.updateVisualSelection(event.clientX, event.clientY);
  }
});

document.addEventListener("mouseup", (event) => {
  const lastPopup = popups.getLastPopup();

  if (!lastPopup) {
    return;
  }

  if (
    lastPopup.type === "image-explain" &&
    lastPopup.isBeingProcessed &&
    lastPopup.isMouseDown &&
    !lastPopup.isSelectionMade
  ) {
    lastPopup.stopVisualSelection(event.clientX, event.clientY);
    lastPopup.cropImageAndInfer();
  }
});

function handleTextExplainTrigger(type) {
  const lastPopup = popups.getLastPopup();

  if (lastPopup && lastPopup.isBeingProcessed) {
    return;
  }

  const selection = window.getSelection();

  if (!selection || selection.toString().trim() === "") {
    return;
  }

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();

  if (type === "quick-explain") {
    popups.createQuickExplainPopup(range, selectedText);
  } else if (type === "contextual-explain") {
    popups.createContextualExplainPopup(range, selectedText);
  }
}

async function handleImageExplainTrigger(type, imageUri) {
  const lastPopup = popups.getLastPopup();

  if (lastPopup && lastPopup.isBeingProcessed) {
    return;
  }

  if (type === "image-explain") {
    popups.createImageExplainPopup(imageUri);
  }
}

function sendMessage(type, popupId, selectedText, additionalContext, imageUri) {
  browser.runtime.sendMessage({
    type: type,
    popupId: popupId,
    selectedText: selectedText,
    additionalContext: additionalContext,
    imageUri: imageUri,
  });
}
