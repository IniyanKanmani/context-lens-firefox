const link = document.createElement("link");
link.rel = "stylesheet";
link.href = browser.runtime.getURL("src/popup.css");
document.head.appendChild(link);

let popupCounter = 0;
const popups = new Map();

function createQuickExplainPopup(popupId, range, selectedText) {
  const popup = document.createElement("div");
  popup.className = "context-lens-popup";
  popup.id = `popup-${popupId}`;

  const rect = range.getBoundingClientRect();
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
    type: "quick-explain",
    content: "",
    isBeingProcessed: true,
    hasReceivedFirstToken: false,
  });

  sendMessage("WEB_QUICK_EXPLAIN", popupId, selectedText);
}

function createContextualExplainPopup(popupId, range, selectedText) {
  const popup = document.createElement("div");
  popup.className = "context-lens-popup context-input";
  popup.id = `popup-${popupId}`;

  const rect = range.getBoundingClientRect();
  let noPageVSpace = false;

  // Vertical Calculation
  let top;
  const estimatedHeight = 80;
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

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Additional context...";

  const button = document.createElement("button");
  const img = document.createElement("img");
  img.src = browser.runtime.getURL("src/icons/send-icon.svg");
  button.appendChild(img);

  popup.appendChild(textarea);
  popup.appendChild(button);
  document.body.appendChild(popup);

  popups.set(popupId, {
    element: popup,
    type: "contextual-explain",
    content: "",
    isBeingProcessed: true,
    gotContextInput: false,
    hasReceivedFirstToken: false,
  });

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(null, null);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, 100);

  const sendContext = () => {
    const additionalContext = textarea.value.trim();

    if (!additionalContext) {
      return;
    }

    const popupData = popups.get(popupCounter);

    if (!popupData) {
      return;
    }

    popupData.gotContextInput = true;

    sendMessage(
      "WEB_CONTEXTUAL_EXPLAIN",
      popupId,
      selectedText,
      additionalContext,
    );

    popup.innerHTML = "";
    popup.classList.remove("context-input");
    popup.classList.add("loading");
    popup.textContent = "Fetching...";
  };

  button.addEventListener("click", sendContext);
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendContext();
    }
  });
}

function createVisualExplainPopup(popupId, imageUri) {
  const prevBodyOverflow = document.body.style.overflow;

  const backdrop = document.createElement("div");
  backdrop.className = "visual-backdrop";
  document.body.appendChild(backdrop);

  const popup = document.createElement("div");
  popup.className = "context-lens-popup visual";
  popup.id = `popup-${popupId}`;

  const img = document.createElement("img");
  img.src = imageUri;
  img.alt = "tab-screen-shot";
  popup.appendChild(img);
  document.body.appendChild(popup);

  const closeBtn = document.createElement("button");
  closeBtn.className = "context-lens-popup visual close-btn";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => removePopup(popupId));
  document.body.appendChild(closeBtn);

  document.body.style.overflow = "hidden";

  popups.set(popupId, {
    element: popup,
    type: "visual-explain",
    isBeingProcessed: true,
    isMouseDown: false,
    selectionRect: null,
    prevBodyOverflow: prevBodyOverflow,
    backdrop: backdrop,
    closeBtn: closeBtn,
  });
}

function drawVisualSelectionPath(popupId, initialX, initialY) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  popup.isMouseDown = true;
  popup.selectionRect = [initialX, initialY, initialX, initialY];

  const selectionRect = popup.selectionRect;
  const [x1, y1, x2, y2] = selectionRect;

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  popup.selectionDiv = document.createElement("div");
  popup.selectionDiv.className = "context-lens-popup visual selection-rect";
  popup.element.appendChild(popup.selectionDiv);

  const popupRect = popup.element.getBoundingClientRect();
  const relativeTop = top - popupRect.top;
  const relativeLeft = left - popupRect.left;

  popup.selectionDiv.style.top = relativeTop + "px";
  popup.selectionDiv.style.left = relativeLeft + "px";
  popup.selectionDiv.style.width = width + "px";
  popup.selectionDiv.style.height = height + "px";
}

function updateVisualSelectionPath(popupId, currentX, currentY) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  popup.selectionRect[2] = currentX;
  popup.selectionRect[3] = currentY;

  const selectionRect = popup.selectionRect;
  const [x1, y1, x2, y2] = selectionRect;

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  const popupRect = popup.element.getBoundingClientRect();
  const relativeTop = top - popupRect.top;
  const relativeLeft = left - popupRect.left;

  popup.selectionDiv.style.top = relativeTop + "px";
  popup.selectionDiv.style.left = relativeLeft + "px";
  popup.selectionDiv.style.width = width + "px";
  popup.selectionDiv.style.height = height + "px";
}

function stopVisualSelectionPath(popupId, currentX, currentY) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  popup.isMouseDown = false;
  popup.selectionRect[2] = currentX;
  popup.selectionRect[3] = currentY;

  const selectionRect = popup.selectionRect;
  const [x1, y1, x2, y2] = selectionRect;

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);

  const popupRect = popup.element.getBoundingClientRect();
  const relativeTop = top - popupRect.top;
  const relativeLeft = left - popupRect.left;

  popup.selectionDiv.style.top = relativeTop + "px";
  popup.selectionDiv.style.left = relativeLeft + "px";
  popup.selectionDiv.style.width = width + "px";
  popup.selectionDiv.style.height = height + "px";
}

function removeVisualSelectionPath(popupId) {
  const popup = popups.get(popupId);

  if (!popup) {
    return;
  }

  popup.selectionRect = null;

  if (popup.selectionDiv) {
    popup.selectionDiv.remove();
  }
}

function visualPopupMetriesConvert(dim, value) {
  if (dim === "w") {
    return value - (window.innerWidth * 5) / 100 - 3;
  } else if (dim === "h") {
    return value - (window.innerHeight * 5) / 100 - 3;
  }

  return value;
}

function removePopup(popupId) {
  const popup = popups.get(popupId);

  if (popup) {
    if (popup.selectionDiv) {
      popup.selectionDiv.remove();
    }

    if (popup.closeBtn) {
      popup.closeBtn.remove();
    }

    popup.element.remove();

    if (popup.backdrop) {
      popup.backdrop.remove();
    }

    if (popup.type === "visual-explain") {
      document.body.style.overflow = popup.prevBodyOverflow;
    }

    popups.delete(popupId);
    popupCounter = popupId;
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
  popupCounter = popupId;
}

function removeAllPopups() {
  for (const [_, popup] of popups) {
    if (popup.selectionDiv) {
      popup.selectionDiv.remove();
    }

    if (popup.closeBtn) {
      popup.closeBtn.remove();
    }

    popup.element.remove();

    if (popup.backdrop) {
      popup.backdrop.remove();
    }

    if (popup.type === "visual-explain") {
      document.body.style.overflow = popup.prevBodyOverflow;
    }
  }

  popups.clear();
  popupCounter = 0;
}
