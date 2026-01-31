/**
 * Image explain popup class for the Context Lens Firefox extension.
 *
 * This class provides a modal interface for selecting regions of a webpage screenshot
 * and sending them to a vision-capable LLM for analysis. It supports visual selection
 * via mouse drag, canvas-based image cropping, and overlay response display.
 *
 * @class ImageExplainPopup
 * @classdesc Popup for visual selection and AI analysis of webpage regions
 */
class ImageExplainPopup {
  /**
   * Creates a new ImageExplainPopup instance.
   *
   * @constructor
   * @param {number} popupId - Unique identifier for this popup instance
   */
  constructor(popupId) {
    /**
     * Popup type identifier.
     * @type {string}
     * @default "image-explain"
     */
    this.type = "image-explain";

    /**
     * Unique popup identifier.
     * @type {number}
     */
    this.popupId = popupId;

    /**
     * Processing state flag. True during selection and LLM processing.
     * @type {boolean}
     * @default true
     */
    this.isBeingProcessed = true;

    /**
     * Flag indicating if LLM inference is in progress.
     * Prevents duplicate inference requests.
     * @type {boolean}
     * @default false
     */
    this.isBeingInfered = false;

    /**
     * Flag tracking if mouse is currently down (dragging in progress).
     * @type {boolean}
     * @default false
     */
    this.isMouseDown = false;

    /**
     * Rectangle coordinates for visual selection [x1, y1, x2, y2] in viewport coordinates.
     * @type {number[]|null}
     * @default null
     */
    this.selectionRect = null;

    /**
     * Flag indicating if a selection has been finalized (mouse released).
     * @type {boolean}
     * @default false
     */
    this.isSelectionMade = false;

    /**
     * Flag indicating if first token has been received from LLM stream.
     * @type {boolean}
     * @default false
     */
    this.hasReceivedFirstToken = false;
  }

  /**
   * Creates and displays the image popup with modal backdrop.
   *
   * @method create
   * @param {string} imageUri - Base64-encoded data URI of the captured tab screenshot
   * @returns {void}
   */
  create(imageUri) {
    shadowContainer.lockPageScroll();

    const backdrop = shadowContainer.createPopupElement(
      `image-backdrop-${this.popupId}`,
      "popup-backdrop",
    );
    this.backdrop = backdrop;

    const popup = shadowContainer.createPopupElement(
      `image-popup-${this.popupId}`,
      "context-lens image-popup",
    );

    const img = document.createElement("img");
    img.src = imageUri;
    img.alt = "Visible Tab Screenshot";
    popup.appendChild(img);

    this.img = img;
    this.element = popup;
    this.imageUri = imageUri;

    const closeBtn = shadowContainer.createPopupElement(
      `image-close-btn-${this.popupId}`,
      "context-lens image-popup close-btn",
    );

    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => removePopup(this.popupId));
    this.closeBtn = closeBtn;
  }

  /**
   * Initiates visual selection mode when user starts dragging.
   *
   * @method startVisualSelection
   * @param {number} initialX - Initial mouse X coordinate (viewport)
   * @param {number} initialY - Initial mouse Y coordinate (viewport)
   * @returns {void}
   */
  startVisualSelection(initialX, initialY) {
    this.isMouseDown = true;
    this.isSelectionMade = false;
    this.selectionRect = [initialX, initialY, initialX, initialY];

    this.selectionDiv = document.createElement("div");
    this.selectionDiv.className = "context-lens image-popup selection-rect";
    this.element.appendChild(this.selectionDiv);

    this.updateSelectionDivDimensions();
  }

  /**
   * Updates the selection rectangle during mouse drag.
   *
   * @method updateVisualSelection
   * @param {number} currentX - Current mouse X coordinate (viewport)
   * @param {number} currentY - Current mouse Y coordinate (viewport)
   * @returns {void}
   */
  updateVisualSelection(currentX, currentY) {
    this.selectionRect[2] = currentX;
    this.selectionRect[3] = currentY;

    this.updateSelectionDivDimensions();
  }

  /**
   * Finalizes visual selection when user releases mouse.
   *
   * @method stopVisualSelection
   * @param {number} finalX - Final mouse X coordinate (viewport)
   * @param {number} finalY - Final mouse Y coordinate (viewport)
   * @returns {void}
   */
  stopVisualSelection(finalX, finalY) {
    this.isMouseDown = false;
    this.isSelectionMade = true;
    this.selectionRect[2] = finalX;
    this.selectionRect[3] = finalY;

    this.updateSelectionDivDimensions();
  }

  /**
   * Crops the selected region and initiates LLM inference.
   *
   * @method cropImageAndInfer
   * @returns {void}
   */
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

  /**
   * Sends the cropped image to the background script for LLM processing.
   *
   * @method sendImage
   * @param {string} imageUri - Base64-encoded data URI of the cropped image region
   * @returns {void}
   */
  sendImage(imageUri) {
    if (!imageUri) {
      return;
    }

    sendMessage("WEB_IMAGE_EXPLAIN", this.popupId, null, null, imageUri);

    this.isBeingInfered = true;
    this.createResponseOverlay();
  }

  /**
   * Updates the visual selection div's dimensions and position.
   *
   * @method updateSelectionDivDimensions
   * @returns {void}
   */
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

  /**
   * Extracts numeric rectangle dimensions from the selection div's styles.
   *
   * @method getSelectionRectFromDiv
   * @param {HTMLElement} selectionDiv - The selection rectangle div element
   * @returns {number[]} Rectangle as [left, top, width, height]
   */
  getSelectionRectFromDiv(selectionDiv) {
    return [
      parseFloat(selectionDiv.style.left),
      parseFloat(selectionDiv.style.top),
      parseFloat(selectionDiv.style.width),
      parseFloat(selectionDiv.style.height),
    ];
  }

  /**
   * Calculates scaled coordinates for canvas cropping.
   *
   * @method calculateScaledCoordinates
   * @param {HTMLImageElement} image - The full screenshot image element
   * @param {DOMRect} imgRect - Bounding rectangle of the displayed image
   * @param {DOMRect} popupRect - Bounding rectangle of the popup container
   * @param {number[]} selectionRect - Selection rectangle [left, top, width, height]
   * @returns {Object} Scaled coordinates for canvas drawImage
   * @returns {number} returns.sx - Source x coordinate
   * @returns {number} returns.sy - Source y coordinate
   * @returns {number} returns.sWidth - Source width
   * @returns {number} returns.sHeight - Source height
   */
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

  /**
   * Creates a response overlay popup positioned near the selection.
   *
   * @method createResponseOverlay
   * @returns {void}
   */
  createResponseOverlay() {
    const popupRectWindow = this.element.getBoundingClientRect();

    const selectionRectDims = {
      left: parseFloat(this.selectionDiv.style.left),
      top: parseFloat(this.selectionDiv.style.top),
      right:
        parseFloat(this.selectionDiv.style.left) +
        parseFloat(this.selectionDiv.style.width),
      bottom:
        parseFloat(this.selectionDiv.style.top) +
        parseFloat(this.selectionDiv.style.height),
      width: parseFloat(this.selectionDiv.style.width),
      height: parseFloat(this.selectionDiv.style.height),
    };

    const overlayWidth = 400;
    const overlayHeight = 150;
    const margin = 5;

    let left, top;

    if (
      selectionRectDims.right + 2 * margin + overlayWidth <=
        popupRectWindow.width &&
      selectionRectDims.top + margin + overlayHeight <= popupRectWindow.height
    ) {
      left = selectionRectDims.right + margin;
      top = selectionRectDims.top;
    } else if (
      selectionRectDims.left + margin + overlayWidth <= popupRectWindow.width &&
      selectionRectDims.bottom + 2 * margin + overlayHeight <=
        popupRectWindow.height
    ) {
      left = selectionRectDims.left;
      top = selectionRectDims.bottom + margin;
    } else if (
      selectionRectDims.left - 2 * margin - overlayWidth >= 0 &&
      selectionRectDims.top + margin + overlayHeight <= popupRectWindow.height
    ) {
      left = selectionRectDims.left - margin - overlayWidth;
      top = selectionRectDims.top;
    } else if (
      selectionRectDims.left + margin + overlayWidth <= popupRectWindow.width &&
      selectionRectDims.top - 2 * margin - overlayHeight >= 0
    ) {
      left = selectionRectDims.left;
      top = selectionRectDims.top - margin - overlayHeight;
    } else {
      left = selectionRectDims.right - margin - overlayWidth;
      top = selectionRectDims.bottom - margin - overlayHeight;
    }

    const responsePopup = shadowContainer.createPopupElement(
      `text-popup-${this.popupId}`,
      "context-lens response-popup",
    );

    responsePopup.style.left = left + "px";
    responsePopup.style.top = top + "px";

    responsePopup.classList.add("loading");
    responsePopup.textContent = "Fetching...";

    this.element.appendChild(responsePopup);
    this.responsePopup = responsePopup;
  }

  /**
   * Removes the visual selection rectangle and clears selection state.
   *
   * @method removeVisualSelection
   * @returns {void}
   */
  removeVisualSelection() {
    if (this.selectionDiv) {
      shadowContainer.removePopupElement(this.selectionDiv);
    }

    this.selectionRect = null;
    this.isSelectionMade = false;
  }

  /**
   * Removes the response overlay and resets inference state.
   *
   * @method removeResponsePopup
   * @returns {void}
   */
  removeResponsePopup() {
    if (this.responsePopup) {
      this.responsePopup.classList.remove("loading");
      shadowContainer.removePopupElement(this.responsePopup);
    }

    this.content = "";
    this.responsePopup = null;
    this.isBeingProcessed = true;
    this.isBeingInfered = false;
    this.hasReceivedFirstToken = false;
  }

  /**
   * Completely removes the image popup and all associated elements.
   *
   * @method remove
   * @returns {void}
   */
  remove() {
    if (this.responsePopup) {
      this.removeResponsePopup();

      return;
    }

    if (this.selectionDiv) {
      shadowContainer.removePopupElement(this.selectionDiv);
    }

    if (this.closeBtn) {
      shadowContainer.removePopupElement(this.closeBtn);
    }

    if (this.element) {
      shadowContainer.removePopupElement(this.element);
    }

    if (this.backdrop) {
      shadowContainer.unlockPageScroll();
      shadowContainer.removePopupElement(this.backdrop);
    }

    this.isBeingProcessed = false;
  }
}
