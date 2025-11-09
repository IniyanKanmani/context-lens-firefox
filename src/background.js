import { streamControllers, invokeLLM } from "./llm_caller.js";

browser.runtime.onMessage.addListener(async (message, sender, _) => {
  if (message.type === "WEB_TEXT_MARKED") {
    await invokeLLM(sender.tab.id, message.popupId, message.content);
  } else if (message.type === "WEB_CANCEL_STREAM") {
    streamControllers[`${sender.tab.id}-${message.popupId}`].abort();
  }
});

export function sendMessage(type, tabId, popupId, content) {
  browser.tabs.sendMessage(tabId, {
    type: type,
    popupId: popupId,
    content: content,
  });
}
