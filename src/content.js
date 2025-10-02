console.log("Content File Loaded");

const style = document.createElement("style");
style.textContent = `
.context-lens-popup {
  background: #333;
  color: white;
  border: 1px solid #666;
  padding: 10px;
  max-width: 400px;
  font-family: sans-serif;
  font-size: 14px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
  user-select: text;
  white-space: pre-wrap;
  word-wrap: break-word;
  z-index: 10000;
  position: absolute;
}
`;
document.head.appendChild(style);

let popupCounter = 0;
const popups = new Map();

function createPopup(popupId, rect, parentRect = null) {
  const popup = document.createElement("div");
  popup.className = "context-lens-popup";
  popup.id = `popup-${popupId}`;

  const estimatedHeight = 100;
  const maxWidth = 400;

  let left = rect.left;
  let top = rect.bottom + 5;

  if (top + estimatedHeight > window.innerHeight) {
    top = rect.top - estimatedHeight - 5;
  }
  if (top < 0) {
    top = 5;
  }

  if (left + maxWidth > window.innerWidth) {
    left = window.innerWidth - maxWidth - 5;
  }
  if (left < 0) {
    left = 5;
  }

  left += window.scrollX;
  top += window.scrollY;

  popup.style.left = left + "px";
  popup.style.top = top + "px";

  document.body.appendChild(popup);
  popups.set(popupId, { element: popup, content: "" });

  return popup;
}

browser.runtime.onMessage.addListener((message, _, __) => {
  if (message.type === "LLM_STREAM_CHUNK") {
    const popupData = popups.get(message.popupId);

    if (popupData) {
      popupData.content += message.content;
      popupData.element.textContent = popupData.content;
    }
  }
  return true;
});

function sendMessage(popupId, content) {
  browser.runtime.sendMessage({
    type: "TEXT_SELECTED",
    popupId: popupId,
    content: content,
  });
}

document.addEventListener("keydown", (event) => {
  if (event.shiftKey && event.altKey) {
    const selection = document.getSelection();
    if (selection && selection.toString().trim() !== "") {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      let parentRect = null;
      const popupEl = selection.anchorNode.parentElement?.closest(
        ".context-lens-popup",
      );

      if (popupEl) {
        parentRect = popupEl.getBoundingClientRect();
      }

      const popupId = ++popupCounter;
      createPopup(popupId, rect, parentRect);

      sendMessage(popupId, selection.toString().trim());
    }
  } else if (event.key === "Escape") removeAllPopups();
});

document.addEventListener("click", (event) => {
  const clickedElement = event.target;
  const isInsidePopup = clickedElement.closest(".context-lens-popup");

  if (!isInsidePopup) removeAllPopups();
});

function removeAllPopups() {
  for (const [_, data] of popups) {
    data.element.remove();
  }

  popups.clear();
  popupCounter = 0;
}
