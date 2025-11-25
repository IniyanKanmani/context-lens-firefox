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
  img.alt = "Screenshot";

  const closeBtn = document.createElement("button");
  closeBtn.className = "context-lens-popup visual close-btn";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => removePopup(popupId));

  popup.appendChild(img);

  document.body.appendChild(popup);
  document.body.appendChild(closeBtn);

  document.body.style.overflow = "hidden";

  popups.set(popupId, {
    element: popup,
    type: "visual-explain",
    isBeingProcessed: false,
    prevBodyOverflow: prevBodyOverflow,
    backdrop: backdrop,
    closeBtn: closeBtn,
    isBeingProcessed: true,
  });
}

function removePopup(popupId) {
  const popup = popups.get(popupId);

  if (popup) {
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
