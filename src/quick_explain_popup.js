class QuickExplainPopup {
  constructor(popupId) {
    this.type = "quick-explain";
    this.popupId = popupId;
    this.isBeingProcessed = true;
    this.hasReceivedFirstToken = false;
  }

  create(range, selectedText) {
    const popup = document.createElement("div");
    popup.className = "context-lens-popup";
    popup.id = `popup-${this.popupId}`;

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

    this.element = popup;

    sendMessage("WEB_QUICK_EXPLAIN", this.popupId, selectedText);
  }

  remove() {
    this.element.remove();
  }
}
