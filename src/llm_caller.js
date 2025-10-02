import { sendMessage } from "./background.js";

console.log("LLM Caller Loaded");

export async function invokeLLM(tabId, popupId, userSelectionContext) {
  const API_KEY = "";

  const request = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + API_KEY,
    },
    body: JSON.stringify({
      model: "z-ai/glm-4.5-air:free",
      stream: true,
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "Explain very concisely what the user asks for. **Important** keep responses to less than 2 lines",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This is what the user selected: \`${userSelectionContext}\``,
            },
          ],
        },
      ],
    }),
  });

  const reader = request.body?.getReader();
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
              sendMessage(tabId, popupId, content);
            }
          } catch (e) {}
        }
      }
    }
  } finally {
    reader.cancel();
  }
}
