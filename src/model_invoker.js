import { getEnv } from "./get_env.js";
import {
  quickExplainSystemPrompt,
  contextualExplainSystemPrompt,
  imageExplainSystemPrompt,
} from "./prompt.js";
import { sendMessage } from "./background.js";

let OPENROUTER_API_KEY;
let OPENROUTER_TEXT_MODEL;
let OPENROUTER_IMAGE_MODEL;

export const streamControllers = new Map();

async function loadenv() {
  OPENROUTER_API_KEY = await getEnv("OPENROUTER_API_KEY");
  OPENROUTER_TEXT_MODEL = await getEnv("OPENROUTER_TEXT_MODEL");
  OPENROUTER_IMAGE_MODEL = await getEnv("OPENROUTER_IMAGE_MODEL");
}

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
