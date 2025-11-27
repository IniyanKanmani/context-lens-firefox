class ContextualExplainPopup {
  constructor(popupId) {
    this.type = "contextual-explain";
    this.popupId = popupId;
    this.isBeingProcessed = true;
    this.gotContextInput = false;
    this.hasReceivedFirstToken = false;
  }

  create(range, selectedText) {
    const popup = document.createElement("div");
    popup.className = "context-lens-popup context-input";
    popup.id = `popup-${this.popupId}`;

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

    this.element = popup;

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
        this.popupId,
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

  remove() {
    this.element.remove();
  }
}
