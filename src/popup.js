console.log("Popup File Loaded");

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = browser.runtime.getURL("src/popup.css");
document.head.appendChild(link);

let popupCounter = 0;
const popups = new Map();

function createPopup(popupId, rect) {
  const popup = document.createElement("div");
  popup.className = "context-lens-popup";
  popup.id = `popup-${popupId}`;

  let top;
  const estimatedHeight = 85;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;

  if (spaceBelow >= estimatedHeight) {
    top = rect.bottom + 5;
  } else if (spaceAbove >= estimatedHeight) {
    top = rect.top - estimatedHeight - 5;
  } else {
    if (spaceBelow > spaceAbove) {
      top = rect.bottom + 5;
    } else {
      top = rect.top - estimatedHeight - 5;
    }
  }

  if (top <= 0) top = 5;
  if (top + estimatedHeight >= window.innerHeight)
    top = window.innerHeight - estimatedHeight - 5;

  let left;
  const estimatedWidth = 405;
  const spaceLeft = rect.left;
  const spaceBetween = rect.right - rect.left;
  const spaceRight = window.innerWidth - rect.right;

  if (spaceBetween >= estimatedWidth) {
    left = rect.left;
  } else if (spaceBetween + spaceRight >= estimatedWidth) {
    left = rect.left;
  } else if (spaceLeft >= estimatedWidth) {
    left = rect.left - estimatedWidth + spaceBetween + spaceRight - 5; // window.innerWidth - estimatedWidth
  }

  if (left <= 0) left = 5;
  if (left + estimatedWidth >= window.innerWidth)
    left = window.innerWidth - estimatedWidth - 5;

  left += window.scrollX;
  top += window.scrollY;

  popup.style.left = left + "px";
  popup.style.top = top + "px";

  popup.classList.add("loading");
  document.body.appendChild(popup);
  popups.set(popupId, {
    element: popup,
    content: "",
    hasReceivedFirstToken: false,
  });

  return popup;
}

function updatePopupContent(popupId, content) {
  const popupData = popups.get(popupId);
  if (popupData) {
    if (!popupData.hasReceivedFirstToken) {
      if (content !== "\n") {
        popupData.element.classList.remove("loading");
        popupData.hasReceivedFirstToken = true;
        popupData.content += content;
        popupData.element.textContent = popupData.content;
      }
    } else {
      popupData.content += content;
      popupData.element.textContent = popupData.content;
    }
  }
}

function removeBranchPopups(popupId) {
  let idToRemove = [];

  for (const [id, data] of popups) {
    if (id > popupId) {
      idToRemove.push(id);
      data.element.remove();
    }
  }

  idToRemove.forEach((id) => popups.delete(id));
}

function removeAllPopups() {
  for (const [_, data] of popups) {
    data.element.remove();
  }

  popups.clear();
  popupCounter = 0;
}
