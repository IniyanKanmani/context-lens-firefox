const link = document.createElement("link");
link.rel = "stylesheet";
link.href = browser.runtime.getURL("src/popup.css");
document.head.appendChild(link);

let popupCounter = 0;
const popups = new Map();

function removePopup(popupId) {
  const popup = popups.get(popupId);

  if (popup) {
    popup.remove();

    popups.delete(popupId);
    popupCounter = popupId - 1;
  }
}

function removeBranchPopups(popupId) {
  let idToRemove = [];

  for (const [id, popup] of popups) {
    if (id > popupId) {
      popup.remove();
      idToRemove.push(id);
    }
  }

  idToRemove.forEach((id) => popups.delete(id));
  popupCounter = popupId;
}

function removeAllPopups() {
  for (const [_, popup] of popups) {
    popup.remove();
  }

  popups.clear();
  popupCounter = 0;
}
