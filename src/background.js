import { invokeLLM } from "./llm_caller.js";

console.log("Background File Loaded");

browser.runtime.onMessage.addListener(async (message, sender, _) => {
  if (message.type === "TEXT_SELECTED") {
    console.log(
      "From Tab: " +
        sender.tab.id +
        ", ID: " +
        message.popupId +
        ", Message: " +
        message.content,
    );

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
