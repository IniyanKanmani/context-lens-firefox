console.log("ContextLens Loaded");

document.addEventListener("keydown", (event) => {
  if (event.shiftKey == true) {
    selected_text = document.getSelection();

    if (selected_text && selected_text.toString() !== "") {
      console.log("Selection: " + selected_text);
    } else {
      console.log("No Selection");
    }
  }
});
