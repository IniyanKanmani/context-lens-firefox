/**
 * Main content script for the Context Lens Firefox extension.
 *
 * This module serves as the primary content script injected into all webpages.
 * It coordinates user interactions, manages popup lifecycle, and handles
 * communication between the UI and the background script.
 *
 * Key responsibilities:
 * - Injects CSS stylesheet for popup styling
 * - Listens for keyboard shortcuts from background script
 * - Handles text selection triggers for quick/contextual explain modes
 * - Manages image explain mode with visual selection
 * - Processes LLM response events and updates UI
 * - Handles user interactions (clicks, keyboard, mouse events)
 * - Manages popup hierarchy and cleanup
 *
 * @module content
 * @description Main content script coordinating all UI interactions
 */

/**
 * Global Popups manager instance.
 * Manages lifecycle of all popup instances on the page.
 * @type {Popups}
 */
const popups = new Popups();

/**
 * Global Shadow DOM container instance.
 * Provides style isolation for all popups.
 * @type {ShadowPopupContainer}
 */
const shadowContainer = new ShadowPopupContainer();
shadowContainer.initialize();

/**
 * Listen for messages from the background script.
 *
 * Handles message types:
 * - SER_QUICK_EXPLAIN_KEY_TRIGGERED: User pressed quick-explain shortcut
 * - SER_CONTEXTUAL_EXPLAIN_KEY_TRIGGERED: User pressed contextual-explain shortcut
 * - SER_IMAGE_EXPLAIN_KEY_TRIGGERED: User pressed image-explain shortcut
 * - SER_LLM_REQUEST_SUCCESS: LLM request initiated successfully
 * - SER_LLM_REQUEST_FAILURE: LLM request failed
 * - SER_LLM_STREAM_CHUNK: New content chunk from LLM stream
 * - SER_LLM_STREAM_CANCELED: LLM stream was cancelled
 * - SER_LLM_STREAM_CLOSED: LLM stream completed
 *
 * @listens browser.runtime.onMessage
 * @param {Object} message - Message object from background script
 * @param {string} message.type - Message type identifier
 * @param {number} [message.popupId] - Popup instance ID
 * @param {string} [message.content] - Message content (chunk or status)
 * @param {string} [message.imageUri] - Image data URI for image mode
 */
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

/**
 * Handle keyboard events for popup management.
 *
 * Escape key behavior:
 * - If last popup is being processed: cancel or close it based on type
 * - If last popup is idle: remove all popups up to last base popup
 *
 * Enter key behavior (image-explain mode only):
 * - If selection is made but not yet inferring: trigger crop and inference
 *
 * @listens document.keydown
 * @param {KeyboardEvent} event - Keyboard event object
 */
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

    // Enter key triggers image inference when selection is ready
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

/**
 * Handle mouse down events for popup interaction and image selection.
 *
 * Click outside popup:
 * - Cancel/close if processing, then remove all popups
 *
 * Click inside text popup:
 * - Cancel processing if clicking a different popup
 * - Remove branch popups (child popups) when clicking parent
 *
 * Click inside image popup:
 * - Start visual selection if in selection mode
 *
 * @listens document.mousedown
 * @param {MouseEvent} event - Mouse event object
 */
document.addEventListener("mousedown", (event) => {
  const composedPath = event.composedPath();
  const isInsidePopup = composedPath.some((el) =>
    el.classList?.contains("context-lens"),
  );

  const lastPopup = popups.getLastPopup();

  if (!lastPopup) {
    return;
  }

  // Click outside any popup - close everything
  if (!isInsidePopup) {
    if (lastPopup.isBeingProcessed) {
      popups.cancelOrCloseLastPopup();
    }

    popups.removeAllPopupsUntillLastBasePopup();

    return;
  }

  if (composedPath.length < 0) {
    return;
  }

  const elementId = composedPath[0].id;

  // Click inside text popup - manage popup hierarchy
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

  // Click inside image popup container - manage popup hierarchy
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

  // Click inside image-explain popup - start selection mode
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

/**
 * Handle mouse move events for visual selection updates.
 *
 * Only active during image-explain mode when:
 * - Popup is being processed
 * - Mouse is currently down (dragging)
 * - Selection has not been finalized
 *
 * @listens document.mousemove
 * @param {MouseEvent} event - Mouse event object
 */
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

/**
 * Handle mouse up events to finalize visual selection.
 *
 * When user releases mouse after dragging on image-explain popup:
 * - Finalize the selection rectangle
 * - Automatically trigger crop and inference
 *
 * @listens document.mouseup
 * @param {MouseEvent} event - Mouse event object
 */
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

/**
 * Handle text explain triggers from keyboard shortcuts.
 *
 * Creates appropriate popup type based on trigger:
 * - quick-explain: Simple explanation popup
 * - contextual-explain: Popup with context input textarea
 *
 * @function handleTextExplainTrigger
 * @param {string} type - The trigger type: "quick-explain" or "contextual-explain"
 * @returns {void}
 */
function handleTextExplainTrigger(type) {
  const lastPopup = popups.getLastPopup();

  if (lastPopup && lastPopup.isBeingProcessed) {
    return;
  }

  let selection;
  let range;
  let isFromShadowDom = false;

  if (shadowContainer.shadow && shadowContainer.shadow.getSelection) {
    const shadowSelection = shadowContainer.shadow.getSelection();

    if (
      shadowSelection &&
      shadowSelection.toString().trim() !== "" &&
      shadowSelection.rangeCount > 0
    ) {
      selection = shadowSelection;
      range = shadowSelection.getRangeAt(0);
      isFromShadowDom = true;
    }
  }

  if (!range) {
    const realSelection = window.getSelection();

    if (
      !realSelection ||
      realSelection.toString().trim() === "" ||
      realSelection.rangeCount === 0
    ) {
      return;
    }

    selection = realSelection;
    range = selection.getRangeAt(0);
  }

  const selectedText = selection.toString().trim();

  if (type === "quick-explain") {
    popups.createQuickExplainPopup(range, selectedText, isFromShadowDom);
  } else if (type === "contextual-explain") {
    popups.createContextualExplainPopup(range, selectedText, isFromShadowDom);
  }
}

/**
 * Handle image explain triggers from keyboard shortcuts.
 *
 * Creates an ImageExplainPopup with the captured screenshot.
 *
 * @async
 * @function handleImageExplainTrigger
 * @param {string} type - The trigger type (always "image-explain")
 * @param {string} imageUri - Base64-encoded data URI of captured tab screenshot
 * @returns {Promise<void>}
 */
async function handleImageExplainTrigger(type, imageUri) {
  const lastPopup = popups.getLastPopup();

  if (lastPopup && lastPopup.isBeingProcessed) {
    return;
  }

  if (type === "image-explain") {
    popups.createImageExplainPopup(imageUri);
  }
}

/**
 * Send a message from content script to background script.
 *
 * @function sendMessage
 * @param {string} type - Message type identifier
 * @param {number} popupId - Popup instance ID
 * @param {string} [selectedText] - Selected text for text-based explanations
 * @param {string} [additionalContext] - Additional context for contextual mode
 * @param {string} [imageUri] - Image data URI for image mode
 * @returns {Promise<void>}
 */
function sendMessage(type, popupId, selectedText, additionalContext, imageUri) {
  browser.runtime.sendMessage({
    type: type,
    popupId: popupId,
    selectedText: selectedText,
    additionalContext: additionalContext,
    imageUri: imageUri,
  });
}
