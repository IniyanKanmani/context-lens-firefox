import {
  streamControllers,
  invokeQuickLLM,
  invokeContextualLLM,
  invokeImageLLM,
} from "./model_invoker.js";

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

export function sendMessage(type, tabId, popupId, content) {
  browser.tabs.sendMessage(tabId, {
    type: type,
    popupId: popupId,
    content: content,
  });
}
