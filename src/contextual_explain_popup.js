/**
 * Contextual explain popup class for the Context Lens Firefox extension.
 *
 * This class represents a popup that allows users to provide additional context
 * before requesting an AI explanation. It displays a textarea input where users
 * can type context, followed by a response area for the LLM output.
 *
 * @class ContextualExplainPopup
 * @classdesc Popup for text explanations with user-provided additional context
 */
class ContextualExplainPopup {
  /**
   * Creates a new ContextualExplainPopup instance.
   *
   * @constructor
   * @param {number} popupId - Unique identifier for this popup instance
   * @param {boolean} isFromShadowDom - Whether the selection is from shadow DOM
   */
  constructor(popupId, isFromShadowDom) {
    /**
     * Popup type identifier.
     * @type {string}
     * @default "contextual-explain"
     */
    this.type = "contextual-explain";

    /**
     * Unique popup identifier.
     * @type {number}
     */
    this.popupId = popupId;

    /**
     * Processing state flag. True during context input and LLM processing.
     * @type {boolean}
     * @default true
     */
    this.isBeingProcessed = true;

    /**
     * Flag indicating if user has submitted context input.
     * Used to determine appropriate close behavior.
     * @type {boolean}
     * @default false
     */
    this.gotContextInput = false;

    /**
     * Flag indicating if first token has been received from LLM stream.
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
   * Creates and displays the popup with context input UI.
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
      "context-lens context-input",
    );

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

    this.element = popup;
    this.selectedText = selectedText;

    // Give textarea focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(null, null);
    }, 50);

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

  /**
   * Submits the additional context and initiates the LLM request.
   *
   * @method sendContext
   * @param {string} additionalContext - The additional context provided by the user
   * @returns {void}
   */
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

    this.restoreSelection();
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
