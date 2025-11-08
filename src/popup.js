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

  let noPageVSpace = false;

  // Vertical Calculation
  let top;
  const estimatedHeight = 77;
  const spaceAbove = rect.top;
  const spaceBetweenV = rect.bottom - rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;

  if (spaceBelow >= estimatedHeight) {
    top = rect.bottom + 5;
  } else if (spaceAbove >= estimatedHeight) {
    top = rect.top - estimatedHeight - 5;
  } else if (spaceBetweenV >= estimatedHeight) {
    top = rect.bottom - estimatedHeight - 5;
    noPageVSpace = true;
  }

  if (top <= 0) top = 5;
  if (top + estimatedHeight >= window.innerHeight)
    top = window.innerHeight - estimatedHeight - 5;

  top += window.scrollY;
  popup.style.top = top + "px";

  // Horizontal Calculation
  let left;
  const estimatedWidth = 405;
  const spaceLeft = rect.left;
  const spaceBetweenH = rect.right - rect.left;
  const spaceRight = window.innerWidth - rect.right;

  if (noPageVSpace) {
    left = rect.right - estimatedWidth - 5;
  } else if (spaceBetweenH >= estimatedWidth) {
    left = rect.left;
  } else if (spaceBetweenH + spaceRight >= estimatedWidth) {
    left = rect.left;
  } else if (spaceLeft >= estimatedWidth) {
    left = window.innerWidth - estimatedWidth - 5;
  }

  if (left <= 0) left = 5;
  if (left + estimatedWidth >= window.innerWidth)
    left = window.innerWidth - estimatedWidth - 5;

  left += window.scrollX;
  popup.style.left = left + "px";

  popup.classList.add("loading");
  popup.textContent = "Fetching...";
  document.body.appendChild(popup);
  popups.set(popupId, {
    element: popup,
    content: "",
    hasReceivedFirstToken: false,
  });

  return popup;
}

function handleLLMRequestSuccess(popupId) {
  const popupData = popups.get(popupId);
  if (popupData) {
    popupData.element.textContent = "Generating...";
  }
}

function handleLLMRequestFailure(popupId) {
  const popupData = popups.get(popupId);
  if (popupData) {
    popupData.element.classList.remove("loading");
    popupData.element.textContent = "Request failed. Please retry...";

    setTimeout(() => {
      popupData.element.remove();
      popups.delete(popupId);
    }, 3000);
  }
}

function handleLLMStreamChunk(popupId, content) {
  const popupData = popups.get(popupId);

  if (!popupData) {
    return;
  }

  if (!popupData.hasReceivedFirstToken && content.includes("\n")) {
    return;
  }

  if (!popupData.hasReceivedFirstToken) {
    popupData.element.classList.remove("loading");
    popupData.hasReceivedFirstToken = true;
  }

  popupData.content += content;
  popupData.element.textContent = popupData.content;
}

function handleLLMStreamClosed(popupId) {
  const popupData = popups.get(popupId);
  if (popupData) {
    setTimeout(() => {
      popupData.element.classList.add("complete");
      setTimeout(() => {
        popupData.element.classList.remove("complete");
      }, 750);
    }, 250);
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
