class Popups {
  constructor() {
    this.counter = 0;
    this.popups = new Map();
    this.basePopups = new Array();
  }

  getPopup(id) {
    return this.popups.get(id);
  }

  getLastPopup() {
    const popup = this.popups.get(this.counter);

    if (!popup) {
      return null;
    }

    return popup;
  }

  createQuickExplainPopup(range, selectedText) {
    const popupId = ++this.counter;

    if (popupId == 1) {
      this.basePopups.push(popupId);
    }

    const popup = new QuickExplainPopup(popupId);
    popup.create(range, selectedText);
    this.popups.set(popupId, popup);
  }

  createContextualExplainPopup(range, selectedText) {
    const popupId = ++this.counter;

    if (popupId == 1) {
      this.basePopups.push(popupId);
    }

    const popup = new ContextualExplainPopup(popupId);
    popup.create(range, selectedText);
    this.popups.set(popupId, popup);
  }

  createImageExplainPopup(imageUri) {
    const popupId = ++this.counter;
    this.basePopups.push(popupId);

    const popup = new ImageExplainPopup(popupId);
    popup.create(imageUri);
    this.popups.set(popupId, popup);
  }

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

  deletePopup(id) {
    this.popups.delete(id);
  }

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
