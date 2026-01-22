class QuickExplainPopup {
  constructor(popupId) {
    this.type = "quick-explain";
    this.popupId = popupId;
    this.isBeingProcessed = true;
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
    popup.className = "context-lens response-popup";
    popup.id = `text-popup-${this.popupId}`;
    popup.style.left = left + "px";
    popup.style.top = top + "px";

    popup.classList.add("loading");
    popup.textContent = "Fetching...";

    document.body.appendChild(popup);
    this.element = popup;
    this.selectedText = selectedText;

    sendMessage("WEB_QUICK_EXPLAIN", this.popupId, this.selectedText);
  }

  remove() {
    this.element.remove();
    this.isBeingProcessed = false;
  }
}
