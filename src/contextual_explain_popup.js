class ContextualExplainPopup {
  constructor(popupId) {
    this.type = "contextual-explain";
    this.popupId = popupId;
    this.isBeingProcessed = true;
    this.gotContextInput = false;
    this.hasReceivedFirstToken = false;
  }

  create(range, selectedText) {
    const rangeRectDims = range.getBoundingClientRect();

    const overlayWidth = 400;
    const overlayHeight = 150;
    const margin = 5;

    let left, top;

    if (
      rangeRectDims.left + margin + overlayWidth <= window.innerWidth &&
      rangeRectDims.bottom + 2 * margin + overlayHeight <= window.innerHeight
    ) {
      left = rangeRectDims.left;
      top = rangeRectDims.bottom + margin;
    } else if (
      rangeRectDims.right + 2 * margin + overlayWidth <= window.innerWidth &&
      rangeRectDims.top + margin + overlayHeight <= window.innerHeight
    ) {
      left = rangeRectDims.right + margin;
      top = rangeRectDims.top;
    } else if (
      rangeRectDims.left - 2 * margin - overlayWidth >= 0 &&
      rangeRectDims.top + margin + overlayHeight <= window.innerHeight
    ) {
      left = rangeRectDims.left - margin - overlayWidth;
      top = rangeRectDims.top;
    } else if (
      rangeRectDims.left + margin + overlayWidth <= window.innerWidth &&
      rangeRectDims.top - 2 * margin - overlayHeight >= 0
    ) {
      left = rangeRectDims.left;
      top = rangeRectDims.top - margin - overlayHeight;
    } else {
      left = rangeRectDims.right - margin - overlayWidth;
      top = rangeRectDims.bottom - margin - overlayHeight;
    }

    const popup = document.createElement("div");
    popup.className = "context-lens context-input";
    popup.id = `text-popup-${this.popupId}`;
    popup.style.left = left + "px";
    popup.style.top = top + "px";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Additional context...";

    const button = document.createElement("button");
    const img = document.createElement("img");
    img.src = browser.runtime.getURL("src/icons/send-icon.svg");
    img.alt = "Send";
    button.appendChild(img);

    popup.appendChild(textarea);
    popup.appendChild(button);
    document.body.appendChild(popup);
    this.element = popup;
    this.selectedText = selectedText;

    // Hack to give textarea focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(null, null);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }, 100);

    button.addEventListener("click", () => {
      this.sendContext(textarea.value.trim());
    });

    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.sendContext(textarea.value.trim());
      }
    });
  }

  sendContext(additionalContext) {
    if (!additionalContext) {
      return;
    }

    this.gotContextInput = true;
    this.additionalContext = additionalContext;

    sendMessage(
      "WEB_CONTEXTUAL_EXPLAIN",
      this.popupId,
      this.selectedText,
      this.additionalContext,
    );

    this.element.innerHTML = "";
    this.element.classList.remove("context-input");
    this.element.classList.add("response-popup");
    this.element.classList.add("loading");
    this.element.textContent = "Fetching...";
  }

  remove() {
    this.element.remove();
    this.isBeingProcessed = false;
  }
}
