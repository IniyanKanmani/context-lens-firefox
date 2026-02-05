/**
 * Quick explain popup class for the Context Lens Firefox extension.
 *
 * This class represents a popup that appears near selected text to display
 * quick AI-generated explanations. It handles positioning logic to ensure
 * the popup appears in a visible area relative to the text selection.
 *
 * @class QuickExplainPopup
 * @classdesc Popup for quick text explanations without additional context
 */
class QuickExplainPopup {
  /**
   * Creates a new QuickExplainPopup instance.
   *
   * @constructor
   * @param {number} popupId - Unique identifier for this popup instance
   * @param {boolean} isFromShadowDom - Whether the selection is from shadow DOM
   */
  constructor(popupId, isFromShadowDom) {
    /**
     * Popup type identifier.
     * @type {string}
     * @default "quick-explain"
     */
    this.type = "quick-explain";

    /**
     * Unique popup identifier.
     * @type {number}
     */
    this.popupId = popupId;

    /**
     * Processing state flag. Set to false when popup is removed or stream ends.
     * @type {boolean}
     * @default true
     */
    this.isBeingProcessed = true;

    /**
     * Flag indicating if first token has been received from LLM stream.
     * Used to manage loading state transitions.
     * @type {boolean}
     * @default false
     */
    this.hasReceivedFirstToken = false;

    /**
     * Whether the selection is from shadow DOM.
     * @type {boolean}
     */
    this.isFromShadowDom = isFromShadowDom;

    /**
     * Original range for selection restoration.
     * @type {Range|null}
     */
    this.originalRange = null;
  }

  /**
   * Creates and displays the popup DOM element.
   *
   * @method create
   * @param {Range} range - DOM Range object representing the selected text position
   * @param {string} selectedText - The text selected by the user for explanation
   * @returns {void}
   */
  create(range, selectedText) {
    this.originalRange = range;

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

    left += window.scrollX;
    top += window.scrollY;

    const popup = shadowContainer.createPopupElement(
      `text-popup-${this.popupId}`,
      "context-lens response-popup",
    );

    popup.style.left = left + "px";
    popup.style.top = top + "px";

    popup.classList.add("loading");
    popup.textContent = "Fetching...";

    this.element = popup;
    this.selectedText = selectedText;

    sendMessage("WEB_QUICK_EXPLAIN", this.popupId, this.selectedText);
  }

  /**
   * Restores the original text selection.
   *
   * @method restoreSelection
   * @returns {void}
   */
  restoreSelection() {
    if (!this.originalRange) return;

    try {
      const startContainer = this.originalRange.startContainer;
      const endContainer = this.originalRange.endContainer;

      if (!startContainer.isConnected || !endContainer.isConnected) {
        return;
      }

      let selection;
      if (this.isFromShadowDom) {
        if (!shadowContainer.shadow) return;
        selection = shadowContainer.shadow.getSelection();
      } else {
        selection = window.getSelection();
      }

      selection.removeAllRanges();
      selection.addRange(this.originalRange);
    } catch (e) {}
  }

  /**
   * Removes the popup from the DOM and updates processing state.
   *
   * @method remove
   * @returns {void}
   */
  remove() {
    this.restoreSelection();
    shadowContainer.removePopupElement(this.element);

    this.isBeingProcessed = false;
  }
}
