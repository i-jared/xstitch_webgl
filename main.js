import { save, drawGrid, clearGrid, initPicture } from "./grid_webgl.js";

function main() {

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const debouncedDrawGrid = debounce((gridSize, numColors) => {
    drawGrid(gridSize, numColors);
  }, 300);

  // Add listeners for inputs
  document.getElementById("gridSize").addEventListener("input", (event) => {
    const gridSize = event.target.value.padStart(3, "0");
    document.getElementById("gridSizeValue").textContent = gridSize;
    const gridSizeInt = parseInt(gridSize);
    debouncedDrawGrid(gridSizeInt, null);
  });

  document.getElementById("numColors").addEventListener("input", (event) => {
    const numColors = event.target.value.padStart(2, "0");
    document.getElementById("numColorsValue").textContent = numColors;
    const numColorsInt = parseInt(numColors);
    debouncedDrawGrid(null, numColorsInt);
  });

  // add listeners for file picker
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const fileName = document.getElementById("file-upload-text");
  const saveButton = document.getElementById("saveButton");

  const defaultText = "Drag and drop files here or click to browse";
  fileName.innerHTML = defaultText;


  saveButton.addEventListener("click", () => {
    save();
  });

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  // get file data and redraw canvas
  function handleFiles(files) {
    if (files.length > 0) {
      const file = files[0];
      if (/\.(png|jpg|jpeg|gif)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const img = new Image();
          img.onload = function () {
            const pixelData = getPixelData(img);

            let gridSize = document.getElementById("gridSizeValue").textContent;
            const gridSizeInt = parseInt(gridSize);
            let numColors =
              document.getElementById("numColorsValue").textContent;
            const numColorsInt = parseInt(numColors);

            initPicture(pixelData, img.width, img.height);
            drawGrid(gridSizeInt, numColorsInt);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        fileName.innerHTML = `${file.name} <span id="clear-selection">X</span>`;

        document
          .getElementById("clear-selection")
          .addEventListener("click", clearSelection);
      } else {
        fileName.innerHTML = "Invalid file type. Please select an image file.";
      }
    }
  }

  function getPixelData(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height).data;
  }

  // clear canvas when clearing file selection
  function clearSelection(e) {
    e.stopPropagation();
    fileInput.value = "";
    fileName.innerHTML = defaultText;
    clearGrid();
  }
}

main();
