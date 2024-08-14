import { jsPDF } from "jspdf";
import eversonMonoFont from "./everson_bold.ttf";

export function generatePDF(
  numRows,
  numCols,
  savedColors,
  imageData,
  colorData
) {
  // Create a new PDF document
  const canvas = document.getElementById("glCanvas");
  const doc = new jsPDF();
  doc.addFont(eversonMonoFont, "everson", "bold");

  // Set font for the title
  doc.setFont("everson", "bold");
  doc.setFontSize(24);

  // Add the title 'xstitch' centered at the top of the first page
  const title = "xstitch";
  const titleWidth =
    (doc.getStringUnitWidth(title) * doc.internal.getFontSize()) /
    doc.internal.scaleFactor;
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(title, (pageWidth - titleWidth) / 2, 20);

  // Add numRows x numCols text
  doc.setFontSize(16);
  const dimensionsText = `${numRows} x ${numCols}`;
  const dimensionsWidth =
    (doc.getStringUnitWidth(dimensionsText) * doc.internal.getFontSize()) /
    doc.internal.scaleFactor;
  doc.text(dimensionsText, (pageWidth - dimensionsWidth) / 2, 30);

  // Add number of colors text
  const colorsText = `${savedColors.length} colors`;
  const colorsWidth =
    (doc.getStringUnitWidth(colorsText) * doc.internal.getFontSize()) /
    doc.internal.scaleFactor;
  doc.text(colorsText, (pageWidth - colorsWidth) / 2, 40);

  // Calculate the dimensions to center the image on the page
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - 20; // 10mm margin on each side
  const maxHeight = pageHeight - 60; // 30mm margin on top and 30mm on bottom

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  let pdfWidth, pdfHeight;
  if (imgWidth / maxWidth > imgHeight / maxHeight) {
    pdfWidth = maxWidth;
    pdfHeight = (imgHeight * maxWidth) / imgWidth;
  } else {
    pdfHeight = maxHeight;
    pdfWidth = (imgWidth * maxHeight) / imgHeight;
  }

  const imagex = (pageWidth - pdfWidth) / 2;
  const imagey = (pageHeight - pdfHeight) / 2 + 10;

  // Add the canvas image to the PDF
  try {
    doc.addImage(imageData, "PNG", imagex, imagey, pdfWidth, pdfHeight);
  } catch (e) {
    console.error("Error adding image to PDF", e);
  }

  // ##############
  // Second Page
  // ##############
  doc.addPage();

  doc.setFont("everson", "bold");
  doc.setFontSize(16);
  doc.text("Color Information", 20, 20);

  doc.setFont("everson", "bold");
  doc.setFontSize(12);

  let yPosition = 40;
  // Define an array of easily distinguishable symbols

  const symbols = [
    "●",
    "■",
    "▲",
    "◆",
    "★",
    "☆",
    "♠",
    "♣",
    "♥",
    "♦",
    "○",
    "□",
    "△",
    "◇",
    "✦",
    "✧",
    "♤",
    "♧",
    "♡",
    "♢",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "!",
    "@",
    "#",
    "$",
    "%",
    "&",
    "*",
    "(",
    ")",
    "-",
    "+",
    "=",
    "<",
    ">",
  ];

  // Ensure we have enough symbols for all colors
  if (savedColors.length > symbols.length) {
    console.warn(
      "More colors than available symbols. Some symbols may repeat."
    );
  }

  // Shuffle the symbols array to randomize symbol assignment
  const shuffledSymbols = [...symbols].sort(() => Math.random() - 0.5);

  savedColors.forEach((color, index) => {
    const colorInfo = `${shuffledSymbols[index]}  #${color.number} - ${color.name}`;

    doc.setFillColor(`#${color.hex}`);
    doc.rect(20, yPosition - 4, 10, 10, "F");

    doc.text(colorInfo, 35, yPosition);

    yPosition += 20;

    if (yPosition > 280) {
      doc.addPage();
      yPosition = 20;
    }
  });
  // ##############
  //  Page 3
  // ##############
  const colorToSymbol = {};
  savedColors.forEach((color, index) => {
    colorToSymbol[color.hex] = shuffledSymbols[index % shuffledSymbols.length];
  });

  const cellsAcross = 20;
  const cellSize = (pageWidth - 40) / cellsAcross;
  const cellsDown = Math.floor((pageHeight - 40) / cellSize);

  const gridStartX = 20;
  const gridStartY = 20;

  function addGridPage(x, y) {
    doc.addPage();
    doc.setFont("everson", "bold");
    doc.setFontSize(16);
    doc.text(`(${x},${y})`, 10, 10);
    doc.setFont("everson", "bold");
    doc.setFontSize(12);
  }

  const numPagesAcross = Math.ceil(numCols / cellsAcross);
  const numPagesDown = Math.ceil(numRows / cellsDown);
  for (
    let pageIndex = 0;
    pageIndex < numPagesAcross * numPagesDown;
    pageIndex++
  ) {
    const pageX = pageIndex % numPagesAcross;
    const pageY = Math.floor(pageIndex / numPagesAcross);
    addGridPage(pageX, pageY);
    const currentCellsDown = Math.min(cellsDown, numRows - pageY * cellsDown);
    const currentCellsAcross = Math.min(
      cellsAcross,
      numCols - pageX * cellsAcross
    );
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    for (let i = 0; i < Math.floor(currentCellsDown / 10); i++) {
      doc.line(
        gridStartX,
        gridStartY + 10 * (i + 1) * cellSize,
        gridStartX + currentCellsAcross * cellSize,
        gridStartY + 10 * (i + 1) * cellSize
      );
    }
    for (let i = 0; i < Math.floor(currentCellsAcross / 10); i++) {
      doc.line(
        gridStartX + 10 * (i + 1) * cellSize,
        gridStartY,
        gridStartX + 10 * (i + 1) * cellSize,
        gridStartY + currentCellsDown * cellSize
      );
    }

    for (let currentY = 0; currentY < currentCellsDown; currentY++) {
      for (let currentX = 0; currentX < currentCellsAcross; currentX++) {
        const pixelIndex =
          (pageY * numCols * cellsDown +
            pageX * cellsAcross +
            currentY * numCols +
            currentX) *
          4;
        const r = colorData[pixelIndex];
        const g = colorData[pixelIndex + 1];
        const b = colorData[pixelIndex + 2];
        const hex = rgbToHex(r, g, b);

        const symbol = colorToSymbol[hex] || "?";

        const cellX = gridStartX + currentX * cellSize;
        const cellY = gridStartY + currentY * cellSize;

        // Draw cell border
        doc.setDrawColor(200, 200, 200);

        doc.setLineWidth(0.1);
        doc.rect(cellX, cellY, cellSize, cellSize);

        // Draw symbol
        doc.setTextColor(0, 0, 0);
        doc.text(symbol, cellX + cellSize / 2, cellY + cellSize / 2, {
          align: "center",
          baseline: "middle",
        });
      }
    }
  }

  // Helper function to convert RGB to HEX
  function rgbToHex(r, g, b) {
    // Convert 0-1 range to 0-255 range
    r = Math.round(r * 255);
    g = Math.round(g * 255);
    b = Math.round(b * 255);
    return ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  doc.save("xstitch_pattern.pdf");
}
