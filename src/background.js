console.log("Background File Loaded");

var currentTabId = null;

browser.runtime.onMessage.addListener((message, sender, _) => {
  if (message.type === "TEXT_SELECTED") {
    console.log("From Tab: " + sender.tab.id + ", Message: " + message.content);

    currentTabId = sender.tab.id;
    sendMessage(message.content);
  }

  return true;
});

async function sendMessage(content) {
  browser.tabs.sendMessage(currentTabId, {
    type: "BROWSER_REPLY",
    content: content,
  });
}
