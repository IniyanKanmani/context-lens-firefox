/**
 * Popup manager class for the Context Lens Firefox extension.
 *
 * The Popups class manages the lifecycle, creation, and removal of all popup
 * instances in the extension. It maintains a hierarchical popup structure where
 * popups can have parent-child relationships (branch popups).
 *
 * Key responsibilities:
 * - Create and track popup instances with unique IDs
 * - Manage popup hierarchy (base popups vs branch popups)
 * - Handle popup removal with proper cleanup
 * - Track which popup is the "last" (most recent) active popup
 *
 * @class Popups
 * @classdesc Manages popup instance lifecycle and hierarchy
 */
class Popups {
  /**
   * Creates a new Popups manager instance.
   * Initializes the popup counter and storage structures.
   *
   * @constructor
   */
  constructor() {
    /**
     * Counter for generating unique popup IDs.
     * Increments with each new popup created.
     * @type {number}
     */
    this.counter = 0;

    /**
     * Map storing all active popup instances keyed by their ID.
     * @type {Map<number, QuickExplainPopup|ContextualExplainPopup|ImageExplainPopup>}
     */
    this.popups = new Map();

    /**
     * Array tracking base popup IDs (root-level popups).
     * Used for managing popup branches and bulk removal.
     * @type {number[]}
     */
    this.basePopups = new Array();
  }

  /**
   * Retrieves a popup instance by its ID.
   *
   * @method getPopup
   * @param {number} id - The unique popup identifier
   * @returns {QuickExplainPopup|ContextualExplainPopup|ImageExplainPopup|undefined} The popup instance or undefined if not found
   */
  getPopup(id) {
    return this.popups.get(id);
  }

  /**
   * Retrieves the most recently created popup (the "last" popup).
   *
   * @method getLastPopup
   * @returns {QuickExplainPopup|ContextualExplainPopup|ImageExplainPopup|null} The last popup or null
   */
  getLastPopup() {
    const popup = this.popups.get(this.counter);

    if (!popup) {
      return null;
    }

    return popup;
  }

  /**
   * Creates a new QuickExplainPopup instance.
   *
   * @method createQuickExplainPopup
   * @param {Range} range - The DOM Range object representing selected text position
   * @param {string} selectedText - The text selected by the user for explanation
   * @param {boolean} isFromShadowDom - Whether the selection is from shadow DOM
   * @returns {void}
   */
  createQuickExplainPopup(range, selectedText, isFromShadowDom) {
    const popupId = ++this.counter;

    if (popupId == 1) {
      this.basePopups.push(popupId);
    }

    const popup = new QuickExplainPopup(popupId, isFromShadowDom);
    popup.create(range, selectedText);
    this.popups.set(popupId, popup);
  }

  /**
   * Creates a new ContextualExplainPopup instance.
   *
   * @method createContextualExplainPopup
   * @param {Range} range - The DOM Range object representing selected text position
   * @param {string} selectedText - The text selected by the user for explanation
   * @param {boolean} isFromShadowDom - Whether the selection is from shadow DOM
   * @returns {void}
   */
  createContextualExplainPopup(range, selectedText, isFromShadowDom) {
    const popupId = ++this.counter;

    if (popupId == 1) {
      this.basePopups.push(popupId);
    }

    const popup = new ContextualExplainPopup(popupId, isFromShadowDom);
    popup.create(range, selectedText);
    this.popups.set(popupId, popup);
  }

  /**
   * Creates a new ImageExplainPopup instance.
   *
   * @method createImageExplainPopup
   * @param {string} imageUri - Base64-encoded data URI of the captured tab screenshot
   * @returns {void}
   */
  createImageExplainPopup(imageUri) {
    const popupId = ++this.counter;
    this.basePopups.push(popupId);

    const popup = new ImageExplainPopup(popupId);
    popup.create(imageUri);
    this.popups.set(popupId, popup);
  }

  /**
   * Cancels or closes the last popup based on its state and type.
   *
   * @method cancelOrCloseLastPopup
   * @returns {void}
   */
  cancelOrCloseLastPopup() {
    const lastPopup = popups.getLastPopup();

    if (lastPopup && !lastPopup.isBeingProcessed) {
      return;
    }

    if (lastPopup.type === "quick-explain") {
      sendMessage("WEB_CANCEL_STREAM", this.counter, null, null);
    } else if (lastPopup.type === "contextual-explain") {
      if (!lastPopup.gotContextInput) {
        this.removePopup(this.counter);
      } else {
        sendMessage("WEB_CANCEL_STREAM", this.counter, null, null);
      }
    } else if (lastPopup.type === "image-explain") {
      if (lastPopup.isBeingInfered) {
        sendMessage("WEB_CANCEL_STREAM", this.counter, null, null);
      } else if (lastPopup.isSelectionMade) {
        lastPopup.removeVisualSelection();
      } else if (lastPopup.isMouseDown) {
        lastPopup.stopVisualSelection();
        lastPopup.removeVisualSelection();
      } else {
        this.removePopup(this.counter);
      }
    }
  }

  /**
   * Removes a popup from the internal Map without DOM cleanup.
   *
   * @method deletePopup
   * @param {number} id - The popup ID to remove from the Map
   * @returns {void}
   */
  deletePopup(id) {
    this.popups.delete(id);
  }

  /**
   * Removes a popup instance completely.
   *
   * @method removePopup
   * @param {number} popupId - The ID of the popup to remove
   * @returns {void}
   */
  removePopup(popupId) {
    const popup = this.popups.get(popupId);

    if (popup) {
      popup.remove();

      if (!popup.isBeingProcessed) {
        if (this.basePopups[this.basePopups.length - 1] === this.counter) {
          this.basePopups.pop();
        }

        this.popups.delete(popupId);
        this.counter = popupId - 1;
      }
    }
  }

  /**
   * Removes all popups that are "branches" of a given popup ID.
   *
   * @method removeBranchPopups
   * @param {number} popupId - The parent popup ID; all popups with higher IDs are removed
   * @returns {void}
   */
  removeBranchPopups(popupId) {
    const idToRemove = [];

    for (const [id, popup] of this.popups) {
      if (id > popupId) {
        popup.remove();
        idToRemove.push(id);
      }
    }

    idToRemove.forEach((id) => this.popups.delete(id));
    this.counter = popupId;
  }

  /**
   * Removes all popups up to and including the last base popup.
   *
   * @method removeAllPopupsUntillLastBasePopup
   * @returns {void}
   */
  removeAllPopupsUntillLastBasePopup() {
    if (this.basePopups.length === 0) {
      return;
    }

    const lastBasePopupId = this.basePopups[this.basePopups.length - 1];
    const idToRemove = [];

    for (const [id, popup] of this.popups) {
      if (id >= lastBasePopupId) {
        popup.remove();

        if (!popup.isBeingProcessed) {
          idToRemove.push(id);
        }
      }
    }

    idToRemove.forEach((id) => this.popups.delete(id));
    this.counter = lastBasePopupId;

    if (idToRemove.includes(lastBasePopupId)) {
      this.basePopups.pop();
      this.counter = lastBasePopupId - 1;
    }
  }
}
