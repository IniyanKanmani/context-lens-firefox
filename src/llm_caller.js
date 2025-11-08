import { getEnv } from "./get_env.js";
import { systemPrompt } from "./prompt.js";
import { sendMessage } from "./background.js";

let OPENROUTER_API_KEY;
let OPENROUTER_MODEL;

async function loadenv() {
  OPENROUTER_API_KEY = await getEnv("OPENROUTER_API_KEY");
  OPENROUTER_MODEL = await getEnv("OPENROUTER_MODEL");
}

export async function invokeLLM(tabId, popupId, userSelectionContext) {
  if (OPENROUTER_API_KEY === undefined || OPENROUTER_MODEL === undefined) {
    await loadenv();
  }

  const request = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + OPENROUTER_API_KEY,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      stream: true,
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: systemPrompt,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userSelectionContext,
            },
          ],
        },
      ],
      provider: {
        allow_fallbacks: true,
        data_collection: "deny",
        zdr: true,
        sort: "latency",
      },
    }),
  });

  if (request.status === 200) {
    sendMessage("LLM_REQUEST_SUCCESS", tabId, popupId, request.status);
    await processStream(tabId, popupId, request.body);
  } else {
    sendMessage("LLM_REQUEST_FAILURE", tabId, popupId, request.status);
  }
}

async function processStream(tabId, popupId, body) {
  const reader = body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
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
              sendMessage("LLM_STREAM_CHUNK", tabId, popupId, content);
            }
          } catch (e) {}
        }
      }
    }
  } finally {
    reader.cancel();
    sendMessage("LLM_STREAM_CLOSED", tabId, popupId, null);
  }
}
