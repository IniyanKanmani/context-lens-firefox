/**
 * LLM invoker module for the Context Lens Firefox extension.
 *
 * This module handles all interactions with the OpenRouter API for three explanation modes:
 * - Quick explain: Simple text explanation without additional context
 * - Contextual explain: Text explanation with user-provided additional context
 * - Image explain: Explanation of selected image regions using vision-capable models
 *
 * @module model_invoker
 * @requires module:get_env
 * @requires module:prompt
 * @requires module:background
 */

import { getEnv } from "./get_env.js";
import {
  quickExplainSystemPrompt,
  contextualExplainSystemPrompt,
  imageExplainSystemPrompt,
} from "./prompt.js";
import { sendMessage } from "./background.js";

/**
 * OpenRouter API key loaded from environment variables.
 * @type {string|undefined}
 * @private
 */
let OPENROUTER_API_KEY;

/**
 * OpenRouter model ID for text-based explanations.
 * @type {string|undefined}
 * @private
 */
let OPENROUTER_TEXT_MODEL;

/**
 * OpenRouter model ID for image-based explanations.
 * @type {string|undefined}
 * @private
 */
let OPENROUTER_IMAGE_MODEL;

/**
 * Map of active AbortControllers for ongoing LLM requests.
 * Used to cancel streams when user triggers cancellation.
 *
 * @type {Map<string, AbortController>}
 * @export
 */
export const streamControllers = new Map();

/**
 * Loads environment variables from the .env file.
 * Called lazily when first LLM invocation is made.
 *
 * @async
 * @function loadenv
 * @returns {Promise<void>}
 * @private
 */
async function loadenv() {
  OPENROUTER_API_KEY = await getEnv("OPENROUTER_API_KEY");
  OPENROUTER_TEXT_MODEL = await getEnv("OPENROUTER_TEXT_MODEL");
  OPENROUTER_IMAGE_MODEL = await getEnv("OPENROUTER_IMAGE_MODEL");
}

/**
 * Invokes the LLM for quick text explanations without additional context.
 *
 * @async
 * @function invokeQuickLLM
 * @param {number} tabId - The ID of the target browser tab
 * @param {number} popupId - Unique identifier for the popup instance
 * @param {string} selectedText - The text selected by the user for explanation
 * @returns {Promise<void>}
 * @export
 */
export async function invokeQuickLLM(tabId, popupId, selectedText) {
  if (OPENROUTER_API_KEY === undefined || OPENROUTER_TEXT_MODEL === undefined) {
    await loadenv();
  }

  const streamController = new AbortController();
  streamControllers[`${tabId}-${popupId}`] = streamController;

  try {
    const request = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + OPENROUTER_API_KEY,
        },
        body: JSON.stringify({
          model: OPENROUTER_TEXT_MODEL,
          stream: true,
          messages: [
            {
              role: "system",
              content: [
                {
                  type: "text",
                  text: quickExplainSystemPrompt,
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: selectedText,
                },
              ],
            },
          ],
          reasoning: {
            effort: "medium",
          },
          max_tokens: 1000,
          provider: {
            order: [
              "hyperbolic",
              "deepinfra/bf16",
              "phala",
              "novita/bf16",
              "together",
            ],
            allow_fallbacks: true,
            data_collection: "deny",
            zdr: true,
            sort: "latency",
          },
        }),
        signal: streamController.signal,
      },
    );

    if (request.status === 200) {
      sendMessage("SER_LLM_REQUEST_SUCCESS", tabId, popupId, request.status);
      await processStream(tabId, popupId, request.body);
    } else {
      sendMessage("SER_LLM_REQUEST_FAILURE", tabId, popupId, request.status);
      delete streamControllers[`${tabId}-${popupId}`];
    }
  } catch (error) {
    if (error.name === "AbortError") {
      sendMessage("SER_LLM_STREAM_CANCELED", tabId, popupId, null);
      delete streamControllers[`${tabId}-${popupId}`];
    }
  }
}

/**
 * Invokes the LLM for contextual text explanations with additional user input.
 *
 * @async
 * @function invokeContextualLLM
 * @param {number} tabId - The ID of the target browser tab
 * @param {number} popupId - Unique identifier for the popup instance
 * @param {string} selectedText - The text selected by the user for explanation
 * @param {string} additionalContext - Additional context provided by the user
 * @returns {Promise<void>}
 * @export
 */
export async function invokeContextualLLM(
  tabId,
  popupId,
  selectedText,
  additionalContext,
) {
  if (OPENROUTER_API_KEY === undefined || OPENROUTER_TEXT_MODEL === undefined) {
    await loadenv();
  }

  const streamController = new AbortController();
  streamControllers[`${tabId}-${popupId}`] = streamController;

  try {
    const request = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + OPENROUTER_API_KEY,
        },
        body: JSON.stringify({
          model: OPENROUTER_TEXT_MODEL,
          stream: true,
          messages: [
            {
              role: "system",
              content: [
                {
                  type: "text",
                  text: contextualExplainSystemPrompt,
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Selected Text:\n${selectedText}\n\nAdditional Context:\n${additionalContext}`,
                },
              ],
            },
          ],
          reasoning: {
            effort: "medium",
          },
          max_tokens: 1000,
          provider: {
            order: [
              "hyperbolic",
              "deepinfra/bf16",
              "phala",
              "novita/bf16",
              "together",
            ],
            allow_fallbacks: true,
            data_collection: "deny",
            zdr: true,
            sort: "latency",
          },
        }),
        signal: streamController.signal,
      },
    );

    if (request.status === 200) {
      sendMessage("SER_LLM_REQUEST_SUCCESS", tabId, popupId, request.status);
      await processStream(tabId, popupId, request.body);
    } else {
      sendMessage("SER_LLM_REQUEST_FAILURE", tabId, popupId, request.status);
      delete streamControllers[`${tabId}-${popupId}`];
    }
  } catch (error) {
    if (error.name === "AbortError") {
      sendMessage("SER_LLM_STREAM_CANCELED", tabId, popupId, null);
      delete streamControllers[`${tabId}-${popupId}`];
    }
  }
}

/**
 * Invokes the LLM for image-based explanations using a vision-capable model.
 *
 * @async
 * @function invokeImageLLM
 * @param {number} tabId - The ID of the target browser tab
 * @param {number} popupId - Unique identifier for the popup instance
 * @param {string} imageUri - Base64-encoded data URI of the selected image region
 * @returns {Promise<void>}
 * @export
 */
export async function invokeImageLLM(tabId, popupId, imageUri) {
  if (
    OPENROUTER_API_KEY === undefined ||
    OPENROUTER_IMAGE_MODEL === undefined
  ) {
    await loadenv();
  }

  const streamController = new AbortController();
  streamControllers[`${tabId}-${popupId}`] = streamController;

  try {
    const request = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + OPENROUTER_API_KEY,
        },
        body: JSON.stringify({
          model: OPENROUTER_IMAGE_MODEL,
          stream: true,
          messages: [
            {
              role: "system",
              content: [
                {
                  type: "text",
                  text: imageExplainSystemPrompt,
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: imageUri,
                },
              ],
            },
          ],
          reasoning: {
            effort: "medium",
          },
          max_tokens: 2000,
          provider: {
            allow_fallbacks: true,
            data_collection: "deny",
            sort: "latency",
          },
        }),
        signal: streamController.signal,
      },
    );

    if (request.status === 200) {
      sendMessage("SER_LLM_REQUEST_SUCCESS", tabId, popupId, request.status);
      await processStream(tabId, popupId, request.body);
    } else {
      sendMessage("SER_LLM_REQUEST_FAILURE", tabId, popupId, request.status);
      delete streamControllers[`${tabId}-${popupId}`];
    }
  } catch (error) {
    if (error.name === "AbortError") {
      sendMessage("SER_LLM_STREAM_CANCELED", tabId, popupId, null);
      delete streamControllers[`${tabId}-${popupId}`];
    }
  }
}

/**
 * Processes the streaming response from the OpenRouter API.
 * Reads chunks from the response body, parses SSE-formatted data,
 * and sends content updates to the content script in real-time.
 *
 * @async
 * @function processStream
 * @param {number} tabId - The ID of the target browser tab
 * @param {number} popupId - Unique identifier for the popup instance
 * @param {ReadableStream} body - The response body stream from fetch
 * @returns {Promise<void>}
 * @private
 */
async function processStream(tabId, popupId, body) {
  const reader = body?.getReader();
  if (!reader) {
    console.error(`Response body is not readable for ${tabId}-${popupId}`);

    sendMessage("SER_LLM_STREAM_CANCELED", tabId, popupId, null);
    delete streamControllers[`${tabId}-${popupId}`];

    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const lineEnd = buffer.indexOf("\n");
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0].delta.content;
            if (content) {
              sendMessage("SER_LLM_STREAM_CHUNK", tabId, popupId, content);
            }
          } catch (e) {}
        }
      }
    }

    reader.cancel();
    sendMessage("SER_LLM_STREAM_CLOSED", tabId, popupId, null);
    delete streamControllers[`${tabId}-${popupId}`];
  } catch (error) {
    if (error.name === "AbortError") {
      sendMessage("SER_LLM_STREAM_CANCELED", tabId, popupId, null);
      delete streamControllers[`${tabId}-${popupId}`];
    }
  }
}
