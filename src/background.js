/**
 * Background script for the Context Lens Firefox extension.
 *
 * This module serves as the main service worker/background script
 *
 * Key responsibilities:
 * - Listens for messages from content scripts
 * - Handles keyboard shortcuts (commands)
 * - Orchestrates LLM invocations for different explanation modes
 * - Manages message passing between content scripts and LLM invoker
 *
 * @module background
 * @requires module:model_invoker
 */

import {
  streamControllers,
  invokeQuickLLM,
  invokeContextualLLM,
  invokeImageLLM,
} from "./model_invoker.js";

/**
 * Message types sent from content scripts to background.
 *
 * @typedef {Object} ContentScriptMessage
 * @property {string} type - Message type identifier
 * @property {number} [popupId] - Unique identifier for the popup instance
 * @property {string} [selectedText] - Text selected by the user
 * @property {string} [additionalContext] - Additional context provided by user
 * @property {string} [imageUri] - Base64-encoded image data URI
 */

/**
 * Listens for messages from content scripts and routes them to appropriate handlers.
 * Handles three main message types:
 * - WEB_QUICK_EXPLAIN: Quick text explanation
 * - WEB_CONTEXTUAL_EXPLAIN: Contextual text explanation with user input
 * - WEB_IMAGE_EXPLAIN: Image region explanation
 * - WEB_CANCEL_STREAM: Cancel ongoing LLM stream
 *
 * @listens browser.runtime.onMessage
 * @param {ContentScriptMessage} message - The message object from content script
 * @param {browser.runtime.MessageSender} sender - Information about the sender
 * @param {function} _sendResponse - Function to send a response (unused)
 * @returns {Promise<void>}
 */
browser.runtime.onMessage.addListener(async (message, sender, _) => {
  if (message.type === "WEB_QUICK_EXPLAIN") {
    await invokeQuickLLM(sender.tab.id, message.popupId, message.selectedText);
  } else if (message.type === "WEB_CONTEXTUAL_EXPLAIN") {
    await invokeContextualLLM(
      sender.tab.id,
      message.popupId,
      message.selectedText,
      message.additionalContext,
    );
  } else if (message.type === "WEB_IMAGE_EXPLAIN") {
    await invokeImageLLM(sender.tab.id, message.popupId, message.imageUri);
  } else if (message.type === "WEB_CANCEL_STREAM") {
    streamControllers[`${sender.tab.id}-${message.popupId}`].abort();
  }
});

/**
 * Listens for keyboard shortcut commands from the browser.
 *
 * @listens browser.commands.onCommand
 * @param {string} command - The command identifier
 * @returns {Promise<void>}
 */
browser.commands.onCommand.addListener(async (command) => {
  const tabs = await browser.tabs.query({ currentWindow: true, active: true });

  if (tabs === undefined || tabs.length == 0) {
    return;
  }

  const tabId = tabs[0]["id"];

  if (command === "quick-explain") {
    browser.tabs.sendMessage(tabId, {
      type: "SER_QUICK_EXPLAIN_KEY_TRIGGERED",
    });
  } else if (command === "contextual-explain") {
    browser.tabs.sendMessage(tabId, {
      type: "SER_CONTEXTUAL_EXPLAIN_KEY_TRIGGERED",
    });
  } else if (command === "image-explain") {
    const imageUri = await browser.tabs.captureVisibleTab();

    browser.tabs.sendMessage(tabId, {
      type: "SER_IMAGE_EXPLAIN_KEY_TRIGGERED",
      imageUri: imageUri,
    });
  }
});

/**
 * Sends a message from background script to a specific tab's content script.
 * Used to communicate LLM response status and stream chunks back to the UI.
 *
 * @function sendMessage
 * @param {string} type - Message type (e.g., 'SER_LLM_REQUEST_SUCCESS', 'SER_LLM_STREAM_CHUNK')
 * @param {number} tabId - The target tab ID
 * @param {number} popupId - The popup instance ID
 * @param {*} content - The message content (string, number, or null)
 * @returns {Promise<void>}
 */
export function sendMessage(type, tabId, popupId, content) {
  browser.tabs.sendMessage(tabId, {
    type: type,
    popupId: popupId,
    content: content,
  });
}
