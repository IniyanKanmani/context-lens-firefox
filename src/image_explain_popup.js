class ImageExplainPopup {
  constructor(popupId) {
    this.type = "image-explain";
    this.popupId = popupId;
    this.isBeingProcessed = true;
    this.isBeingInfered = false;
    this.isMouseDown = false;
    this.selectionRect = null;
    this.isSelectionMade = false;
    this.hasReceivedFirstToken = false;
  }

  create(imageUri) {
    const backdrop = document.createElement("div");
    backdrop.className = "popup-backdrop";
    document.body.appendChild(backdrop);
    this.backdrop = backdrop;

    const popup = document.createElement("div");
    popup.className = "context-lens-popup image";
    popup.id = `popup-${this.popupId}`;

    const img = document.createElement("img");
    img.src = imageUri;
    img.alt = "Visible Tab Screenshot";
    popup.appendChild(img);

    this.img = img;
    this.element = popup;
    this.imageUri = imageUri;
    document.body.appendChild(popup);

    const closeBtn = document.createElement("button");
    closeBtn.className = "context-lens-popup image close-btn";
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
    this.selectionDiv.className = "context-lens-popup image selection-rect";
    this.element.appendChild(this.selectionDiv);

    this.updateSelectionDivDimensions();
  }

  updateVisualSelection(currentX, currentY) {
    this.selectionRect[2] = currentX;
    this.selectionRect[3] = currentY;

    this.updateSelectionDivDimensions();
  }

  stopVisualSelection(finalX, finalY) {
    this.isMouseDown = false;
    this.isSelectionMade = true;
    this.selectionRect[2] = finalX;
    this.selectionRect[3] = finalY;

    this.updateSelectionDivDimensions();
  }

  cropImageAndInfer() {
    const image = new Image();
    image.src = this.imageUri;

    image.onload = () => {
      const imgElement = this.img;
      const imgRect = imgElement.getBoundingClientRect();
      const popupRect = this.element.getBoundingClientRect();
      const selectionRect = this.getSelectionRectFromDiv(this.selectionDiv);

      const { sx, sy, sWidth, sHeight } = this.calculateScaledCoordinates(
        image,
        imgRect,
        popupRect,
        selectionRect,
      );

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = sWidth;
      canvas.height = sHeight;

      context.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

      const croppedImageUri = canvas.toDataURL("image/png", 1);
      this.sendImage(croppedImageUri);
    };
  }

  sendImage(imageUri) {
    if (!imageUri) {
      return;
    }

    sendMessage("WEB_IMAGE_EXPLAIN", this.popupId, null, null, imageUri);

    this.isBeingInfered = true;
    this.createResponseOverlay();
  }

  updateSelectionDivDimensions() {
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

  getSelectionRectFromDiv(selectionDiv) {
    return [
      parseFloat(selectionDiv.style.left),
      parseFloat(selectionDiv.style.top),
      parseFloat(selectionDiv.style.width),
      parseFloat(selectionDiv.style.height),
    ];
  }

  calculateScaledCoordinates(image, imgRect, popupRect, selectionRect) {
    const [left, top, width, height] = selectionRect;
    const scaleX = image.naturalWidth / imgRect.width;
    const scaleY = image.naturalHeight / imgRect.height;
    const imageOffsetLeft = imgRect.left - popupRect.left;
    const imageOffsetTop = imgRect.top - popupRect.top;

    const sx = (left - imageOffsetLeft) * scaleX;
    const sy = (top - imageOffsetTop) * scaleY;
    const sWidth = width * scaleX;
    const sHeight = height * scaleY;

    return { sx, sy, sWidth, sHeight };
  }

  createResponseOverlay() {
    const popupRect = this.element.getBoundingClientRect();

    const selectionLeft = parseFloat(this.selectionDiv.style.left);
    const selectionTop = parseFloat(this.selectionDiv.style.top);
    const selectionWidth = parseFloat(this.selectionDiv.style.width);
    const selectionHeight = parseFloat(this.selectionDiv.style.height);

    const selectionAbsRect = {
      left: selectionLeft,
      top: selectionTop,
      right: selectionLeft + selectionWidth,
      bottom: selectionTop + selectionHeight,
      width: selectionWidth,
      height: selectionHeight,
    };

    const overlayWidth = 400;
    const overlayHeight = 150;
    const margin = 5;

    let left, top;

    if (
      selectionAbsRect.right + margin + overlayWidth <= popupRect.width &&
      selectionAbsRect.top + margin + overlayHeight <= popupRect.height
    ) {
      left = selectionAbsRect.right + margin;
      top = selectionAbsRect.top;
    } else if (
      selectionAbsRect.left + margin + overlayWidth <= popupRect.width &&
      selectionAbsRect.bottom + margin + overlayHeight <= popupRect.height
    ) {
      left = selectionAbsRect.left;
      top = selectionAbsRect.bottom + margin;
    } else if (
      selectionAbsRect.left - margin - overlayWidth >= 0 &&
      selectionAbsRect.top + margin + overlayHeight <= popupRect.height
    ) {
      left = selectionAbsRect.left - margin - overlayWidth;
      top = selectionAbsRect.top;
    } else if (
      selectionAbsRect.left + margin + overlayWidth <= popupRect.width &&
      selectionAbsRect.top - margin - overlayHeight >= 0
    ) {
      left = selectionAbsRect.left;
      top = selectionAbsRect.top - margin - overlayHeight;
    } else {
      left = selectionAbsRect.right - margin - overlayWidth;
      top = selectionAbsRect.bottom - margin - overlayHeight;
    }

    const overlay = document.createElement("div");
    overlay.className = "context-lens-popup image-response-overlay";
    overlay.style.left = left + "px";
    overlay.style.top = top + "px";

    overlay.classList.add("loading");
    overlay.textContent = "Fetching...";

    this.element.appendChild(overlay);
    this.responsePopup = overlay;
  }

  removeVisualSelection() {
    if (this.selectionDiv) {
      this.selectionDiv.remove();
    }

    this.selectionRect = null;
    this.isSelectionMade = false;
  }

  removeResponsePopup() {
    if (this.responsePopup) {
      this.responsePopup.classList.remove("loading");
      this.responsePopup.remove();
    }

    this.content = "";
    this.responsePopup = null;
    this.isBeingProcessed = true;
    this.isBeingInfered = false;
    this.hasReceivedFirstToken = false;
  }

  remove() {
    if (this.responsePopup) {
      this.removeResponsePopup();

      return;
    }

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

    this.isBeingProcessed = false;
  }
}
