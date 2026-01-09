const link = document.createElement("link");
link.rel = "stylesheet";
link.href = browser.runtime.getURL("src/popup.css");
document.head.appendChild(link);

let popupCounter = 0;
let basePopupsIds = new Array();
const popups = new Map();

function removePopup(popupId) {
  const popup = popups.get(popupId);

  if (popup) {
    popup.remove();

    if (!popup.isBeingProcessed) {
      if (basePopupsIds[basePopupsIds.length - 1] === popupCounter) {
        basePopupsIds.pop();
      }

      popups.delete(popupId);
      popupCounter = popupId - 1;
    }
  }
}

function removeBranchPopups(popupId) {
  const idToRemove = [];

  for (const [id, popup] of popups) {
    if (id > popupId) {
      popup.remove();
      idToRemove.push(id);
    }
  }

  idToRemove.forEach((id) => popups.delete(id));
  popupCounter = popupId;
}

function removeAllPopupsUntillLastBasePopup() {
  if (basePopupsIds.length === 0) {
    return;
  }

  const lastBasePopupId = basePopupsIds[basePopupsIds.length - 1];
  const idToRemove = [];

  for (const [id, popup] of popups) {
    popup.remove();

    if (id > lastBasePopupId) {
      idToRemove.push(id);
    }
  }

  idToRemove.forEach((id) => popups.delete(id));
  popupCounter = lastBasePopupId;
}
