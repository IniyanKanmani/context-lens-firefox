class VisualExplainPopup {
  constructor(popupId) {
    this.type = "visual-explain";
    this.popupId = popupId;
    this.isBeingProcessed = true;
    this.isMouseDown = false;
    this.selectionRect = null;
    this.isSelectionMade = false;
    this.hasReceivedFirstToken = false;
  }

  create(imageUri) {
    const backdrop = document.createElement("div");
    backdrop.className = "visual-backdrop";
    document.body.appendChild(backdrop);
    this.backdrop = backdrop;

    const popup = document.createElement("div");
    popup.className = "context-lens-popup visual";
    popup.id = `popup-${this.popupId}`;

    const img = document.createElement("img");
    img.src = imageUri;
    img.alt = `tab-screen-shot-popup-${this.popupId}`;
    popup.appendChild(img);
    document.body.appendChild(popup);
    this.element = popup;

    const closeBtn = document.createElement("button");
    closeBtn.className = "context-lens-popup visual close-btn";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => removePopup(this.popupId));
    document.body.appendChild(closeBtn);
    this.closeBtn = closeBtn;
  }

  startVisualSelection(initialX, initialY) {
    if (this.isSelectionMade) {
      this.removeVisualSelection();
    }

    this.isMouseDown = true;
    this.isSelectionMade = false;
    this.selectionRect = [initialX, initialY, initialX, initialY];

    this.selectionDiv = document.createElement("div");
    this.selectionDiv.className = "context-lens-popup visual selection-rect";
    this.element.appendChild(this.selectionDiv);

    this.updateSelectionDivDim();
  }

  updateVisualSelection(currentX, currentY) {
    this.selectionRect[2] = currentX;
    this.selectionRect[3] = currentY;

    this.updateSelectionDivDim();
  }

  stopVisualSelection(finalX, finalY) {
    this.isMouseDown = false;
    this.isSelectionMade = true;
    this.selectionRect[2] = finalX;
    this.selectionRect[3] = finalY;

    this.updateSelectionDivDim();
  }

  updateSelectionDivDim() {
    const [x1, y1, x2, y2] = this.selectionRect;

    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    const popupRect = this.element.getBoundingClientRect();
    const relativeTop = top - popupRect.top;
    const relativeLeft = left - popupRect.left;

    this.selectionDiv.style.top = relativeTop + "px";
    this.selectionDiv.style.left = relativeLeft + "px";
    this.selectionDiv.style.width = width + "px";
    this.selectionDiv.style.height = height + "px";
  }

  removeVisualSelection() {
    if (this.selectionDiv) {
      this.selectionDiv.remove();
    }

    this.selectionRect = null;
    this.isSelectionMade = false;
  }

  convertClientToPopupDim(dim, value) {
    if (dim === "w") {
      return value - (window.innerWidth * 5) / 100 - 3;
    } else if (dim === "h") {
      return value - (window.innerHeight * 5) / 100 - 3;
    }

    return value;
  }

  remove() {
    if (this.closeBtn) {
      this.closeBtn.remove();
    }

    if (this.selectionDiv) {
      this.selectionDiv.remove();
    }

    this.element.remove();

    if (this.backdrop) {
      this.backdrop.remove();
    }
  }
}
