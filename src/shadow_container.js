/**
 * Shadow DOM container for the Context Lens Firefox extension.
 *
 * This class provides a shared Shadow DOM for all popups to ensure complete
 * style isolation from host websites. It manages:
 * - Shadow DOM creation and CSS injection
 * - Popup element creation within the shadow tree
 * - Page scroll lock for modal image mode
 *
 * @class ShadowPopupContainer
 * @classdesc Manages shared Shadow DOM for all popup instances
 */
class ShadowPopupContainer {
  /**
   * Creates a new ShadowPopupContainer instance.
   * Initializes the host element and shadow root.
   *
   * @constructor
   */
  constructor() {
    /**
     * Shadow host element attached to document.body.
     * @type {HTMLElement|null}
     */
    this.host = null;

    /**
     * Shadow root for style isolation.
     * @type {ShadowRoot|null}
     */
    this.shadow = null;

    /**
     * CSS text content fetched from popup.css.
     * @type {string|null}
     */
    this.cssText = null;

    /**
     * Horizontal Scroll position when page was locked (for restoration).
     * @type {number}
     * @default 0
     */
    this.lockedScrollX = 0;

    /**
     * Vertical Scroll position when page was locked (for restoration).
     * @type {number}
     * @default 0
     */
    this.lockedScrollY = 0;
  }

  /**
   * Initializes the shadow DOM container.
   * Creates host element, attaches shadow root, and injects CSS.
   *
   * @async
   * @method initialize
   * @returns {Promise<void>}
   */
  async initialize() {
    this.host = document.createElement("div");
    this.host.id = "context-lens-shadow-host";
    this.host.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      min-height: 100%;
      pointer-events: none;
      z-index: 100;
    `;

    this.shadow = this.host.attachShadow({ mode: "open" });

    try {
      const response = await fetch(browser.runtime.getURL("src/popup.css"));
      this.cssText = await response.text();

      const style = document.createElement("style");
      style.textContent = this.cssText;
      this.shadow.appendChild(style);
    } catch (error) {
      console.error("Failed to load popup CSS:", error);
    }

    document.body.appendChild(this.host);
  }

  /**
   * Creates a popup element inside the shadow DOM.
   *
   * @method createPopupElement
   * @param {string} id - Unique identifier for the popup
   * @param {string} className - CSS class names for the popup
   * @returns {HTMLElement} The created popup element
   */
  createPopupElement(id, className) {
    const popup = document.createElement("div");
    popup.id = id;
    popup.className = className;
    popup.style.pointerEvents = "auto";

    this.shadow.appendChild(popup);
    return popup;
  }

  /**
   * Removes a popup element from the shadow DOM.
   *
   * @method removePopupElement
   * @param {HTMLElement} element - The element to remove
   * @returns {void}
   */
  removePopupElement(element) {
    if (element && element.parentNode) {
      element.remove();
    }
  }

  /**
   * Locks page scroll for modal image mode.
   * Freezes the page by fixing body position and saving scroll position.
   *
   * @method lockPageScroll
   * @returns {void}
   */
  lockPageScroll() {
    this.lockedScrollX = window.scrollX;
    this.lockedScrollY = window.scrollY;
  }

  /**
   * Unlocks page scroll after modal image mode closes.
   * Restores body position and scrolls back to original position.
   *
   * @method unlockPageScroll
   * @returns {void}
   */
  unlockPageScroll() {
    window.scrollTo(this.lockedScrollX || 0, this.lockedScrollY || 0);

    this.lockedScrollX = 0;
    this.lockedScrollY = 0;
  }
}
