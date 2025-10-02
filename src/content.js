console.log("Content File Loaded");

browser.runtime.onMessage.addListener((message, _, __) => {
  if (message.type === "BROWSER_REPLY") {
    console.log("From Browser: " + message.content);
  }

  return true;
});

function sendMessage(content) {
  browser.runtime.sendMessage({
    type: "TEXT_SELECTED",
    content: content,
  });
}

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey == true) {
    selected_text = document.getSelection();

    if (selected_text && selected_text.toString() !== "") {
      console.log("DOM Selection: " + selected_text);

      sendMessage(selected_text.toString());
    }
  }
});
