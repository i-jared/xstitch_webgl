import { jsPDF } from "jspdf";

export function generatePDF(numRows, numCols, savedColors, imageData) {
  // Create a new PDF document
  const canvas = document.getElementById("glCanvas");
  const doc = new jsPDF();

  // Set font for the title
  doc.setFont("helvetica", "bold");
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

  const x = (pageWidth - pdfWidth) / 2;
  const y = (pageHeight - pdfHeight) / 2 + 10;

  // Add the canvas image to the PDF
  try {
    doc.addImage(imageData, "PNG", x, y, pdfWidth, pdfHeight);
  } catch (e) {
    console.error("Error adding image to PDF", e);
  }

  // ##############
  // Second Page
  // ##############
  doc.addPage();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Color Information", 20, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  let yPosition = 40;

  savedColors.forEach((color, index) => {
    const colorInfo = `#${color.number} - ${color.name}`;

    doc.setFillColor(`#${color.hex}`);
    doc.rect(20, yPosition - 4, 10, 10, "F");

    doc.text(colorInfo, 35, yPosition);

    yPosition += 20;

    if (yPosition > 280) {
      doc.addPage();
      yPosition = 20;
    }
  });
  // Add a 300 ms timeout before saving the PDF
  doc.save("xstitch_pattern.pdf");
}
