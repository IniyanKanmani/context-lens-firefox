/**
 * LLM response handler module for the Context Lens Firefox extension.
 *
 * This module contains handlers for processing LLM response events sent from the
 * background script to the content script. It manages the UI state of popups
 * during the streaming response lifecycle.
 *
 * @module model_response_handler
 * @description Response handlers for LLM streaming events
 */

/**
 * Handles successful LLM API request initiation.
 *
 * @function handleLLMRequestSuccess
 * @param {number} popupId - Unique identifier for the popup instance
 * @returns {void}
 */
function handleLLMRequestSuccess(popupId) {
  const popup = popups.getPopup(popupId);

  if (!popup) {
    return;
  }

  const targetElement =
    popup.type === "image-explain" ? popup.responsePopup : popup.element;
  targetElement.textContent = "Generating...";
}

/**
 * Handles failed LLM API request.
 *
 * @function handleLLMRequestFailure
 * @param {number} popupId - Unique identifier for the popup instance
 * @returns {void}
 */
function handleLLMRequestFailure(popupId) {
  const popup = popups.getPopup(popupId);

  if (!popup) {
    return;
  }

  const targetElement =
    popup.type === "image-explain" ? popup.responsePopup : popup.element;
  targetElement.classList.remove("loading");
  targetElement.textContent = "Request failed. Please retry...";

  setTimeout(() => {
    popups.removePopup(popupId);
  }, 3000);
}

/**
 * Handles incoming content chunks from the LLM stream.
 *
 * @function handleLLMStreamChunk
 * @param {number} popupId - Unique identifier for the popup instance
 * @param {string} content - New content chunk from the LLM stream
 * @returns {void}
 */
function handleLLMStreamChunk(popupId, content) {
  const popup = popups.getPopup(popupId);

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

/**
 * Handles stream cancellation request.
 *
 * @function handleLLMStreamCancel
 * @param {number} popupId - Unique identifier for the popup instance
 * @returns {void}
 */
function handleLLMStreamCancel(popupId) {
  const popup = popups.getPopup(popupId);

  if (!popup) {
    return;
  }

  popups.removePopup(popupId);
}

/**
 * Handles stream completion.
 *
 * @function handleLLMStreamClosed
 * @param {number} popupId - Unique identifier for the popup instance
 * @returns {void}
 */
function handleLLMStreamClosed(popupId) {
  const popup = popups.getPopup(popupId);

  if (!popup) {
    return;
  }

  const targetElement =
    popup.type === "image-explain" ? popup.responsePopup : popup.element;

  setTimeout(() => {
    targetElement.classList.add("complete");
    popup.hasReceivedFirstToken = false;
    popup.isBeingProcessed = false;

    if (popup.type === "image-explain") {
      popup.isBeingInfered = false;
    }

    setTimeout(() => {
      targetElement.classList.remove("complete");
    }, 750);
  }, 250);
}
