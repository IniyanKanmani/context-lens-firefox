import { invokeLLM } from "./llm_caller.js";

browser.runtime.onMessage.addListener(async (message, sender, _) => {
  if (message.type === "TEXT_SELECTED") {
    await invokeLLM(sender.tab.id, message.popupId, message.content);
  }

  return true;
});

export function sendMessage(tabId, popupId, content) {
  browser.tabs.sendMessage(tabId, {
    type: "LLM_STREAM_CHUNK",
    popupId: popupId,
    content: content,
  });
}
