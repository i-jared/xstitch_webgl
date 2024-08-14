import customXVertices from "./stitch_shape.js";
import { findClosestDMCColor } from "./dmc_colors.js";
import { kMeansCluster } from "./kmeans.js";
import { generatePDF } from "./pdf_gen.js";

// #####################################
// ########### WebGL Setup #############
// #####################################

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });

var pictureData = new Float32Array(0);
var scaledData = new Float32Array(0);
var colorData = new Float32Array(0);
var finalImageData;
var imageHeight = 0;
var imageWidth = 0;
var currWidth = 50;
var currHeight = 50;
var currColors = 10;
var savedColors = [];

if (!gl) {
  console.error("WebGL 2.0 not supported");
}

const vertexShaderSource = `
    attribute vec2 aVertexPosition;
    attribute vec2 aInstancePosition;
    attribute vec4 aInstanceColor;
    uniform float uResolution; 
    varying vec4 vColor;

    void main() {
        vec2 position = aVertexPosition * uResolution + aInstancePosition;

        gl_Position = vec4(position, 0, 1);
        vColor = aInstanceColor;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    varying vec4 vColor;

    void main() {
        gl_FragColor = vColor;
    }
`;

// Create shaders and program
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);

if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
  console.error(
    "Vertex Compilation failed: ",
    gl.getShaderInfoLog(vertexShader)
  );
}
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
  console.error(
    "Fragment Compilation failed: ",
    gl.getShaderInfoLog(fragmentShader)
  );
}

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error("Program linking failed: ", gl.getProgramInfoLog(program));
}

// link js arrays to glsl buffers
const vPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
const iPositionAttribute = gl.getAttribLocation(program, "aInstancePosition");
const colorAttributeLocation = gl.getAttribLocation(program, "aInstanceColor");
const resolutionUniformLocation = gl.getUniformLocation(program, "uResolution");
if (
  vPositionAttribute === -1 ||
  iPositionAttribute === -1 ||
  colorAttributeLocation === -1
) {
  console.error("Failed to get attribute locations");
}
if (resolutionUniformLocation === null) {
  console.error("Failed to get uniform location");
}

const instancePositionBuffer = gl.createBuffer();
const vertexPositionBuffer = gl.createBuffer();
const colorBuffer = gl.createBuffer();

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.clearColor(1.0, 1.0, 1.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.useProgram(program);
_checkGLError(gl, "useProgram");

// bind the stitch shape to its buffer as that doesn't change
gl.enableVertexAttribArray(vPositionAttribute);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
gl.vertexAttribPointer(vPositionAttribute, 2, gl.FLOAT, false, 0, 0);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array(customXVertices),
  gl.STATIC_DRAW
);
_checkGLError(gl, "vpositionattribute location and data");

gl.enableVertexAttribArray(iPositionAttribute);
gl.bindBuffer(gl.ARRAY_BUFFER, instancePositionBuffer);
gl.vertexAttribPointer(iPositionAttribute, 2, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(iPositionAttribute, 1);
_checkGLError(gl, "iPositionAttribute location");

gl.enableVertexAttribArray(colorAttributeLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(colorAttributeLocation, 1);
_checkGLError(gl, "colorAttributeLocation location");

// #####################################
// ########### WebGL Functions #########
// #####################################

function _checkGLError(gl, step) {
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.error(`WebGL error at ${step}: ${error}`);
  }
}

// #####################################
// ########### Private Functions #######
// #####################################

function _redraw(positions, colorData) {
  gl.bindBuffer(gl.ARRAY_BUFFER, instancePositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  _checkGLError(gl, "instancePositionBuffer data");

  gl.uniform1f(resolutionUniformLocation, 1 / Math.max(currWidth, currHeight));
  _checkGLError(gl, "resolutionUniformLocation");

  // Update color buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArraysInstanced(
    gl.TRIANGLES,
    0,
    customXVertices.length / 2,
    currWidth * currHeight
  );

  // Create a buffer to store the pixel data
  let exportData = new Uint8Array(canvas.height * canvas.width * 4); // 4 bytes per pixel (RGBA)
  // Read the pixels from the framebuffer
  gl.readPixels(
    0,
    0,
    canvas.width,
    canvas.height,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    exportData
  );
  // Reverse exportData while maintaining RGBA order
  let reversedData = new Uint8Array(exportData.length);
  for (let i = 0; i < canvas.height; i++) {
    for (let j = 0; j < canvas.width; j++) {
      const srcIndex = ((canvas.height - 1 - i) * canvas.width + j) * 4;
      const destIndex = (i * canvas.width + j) * 4;
      reversedData[destIndex] = exportData[srcIndex];
      reversedData[destIndex + 1] = exportData[srcIndex + 1];
      reversedData[destIndex + 2] = exportData[srcIndex + 2];
      reversedData[destIndex + 3] = exportData[srcIndex + 3];
    }
  }
  exportData = reversedData;

  // Create an ImageData object
  finalImageData = new ImageData(
    new Uint8ClampedArray(exportData),
    canvas.width,
    canvas.height
  );

  _checkGLError(gl, "drawArraysInstanced");
}

function _setNewSize(numCols) {
  let dimX = imageWidth;
  let dimY = imageHeight;

  const numRows = Math.floor((numCols * dimY) / dimX);

  // Create a new array for the scaled data
  scaledData = new Float32Array(numCols * numRows * 4);
  const scaleX = dimX / numCols;
  const scaleY = dimY / numRows;

  // Perform nearest neighbor scaling
  for (let newY = 0; newY < numRows; newY++) {
    for (let newX = 0; newX < numCols; newX++) {
      const oldX = Math.min(Math.floor(newX * scaleX), dimX - 1);
      const oldY = Math.min(Math.floor(newY * scaleY), dimY - 1);

      const oldIndex = (oldY * imageWidth + oldX) * 4;
      const newIndex = (newY * numCols + newX) * 4;

      scaledData[newIndex] = pictureData[oldIndex];
      scaledData[newIndex + 1] = pictureData[oldIndex + 1];
      scaledData[newIndex + 2] = pictureData[oldIndex + 2];
      scaledData[newIndex + 3] = pictureData[oldIndex + 3];
    }
  }

  // Update the count
  currWidth = numCols;
  currHeight = numRows;

  const numTotal = numRows * numCols;
  const halfWidth = 1 / numCols;

  const positions = new Float32Array(numTotal * 2);

  const adjX = Math.min(1, numCols / numRows);
  const adjY = Math.min(1, numRows / numCols);

  for (let i = 0; i < numTotal; i++) {
    const x = ((i % numCols) / numCols) * adjX * 2 - 1 + halfWidth;
    const y = 1 - (Math.floor(i / numCols) / numRows) * 2 * adjY - halfWidth;
    positions[i * 2] = x;
    positions[i * 2 + 1] = y;
  }
  return positions;
}

function _setNewColors(numColors) {
  // Perform k-means clustering
  const { clusters, assignments } = kMeansCluster(scaledData, numColors);
  currColors = numColors;

  var clusterDMCColors = [];

  // Replace cluster colors with closest DMC colors
  for (let i = 0; i < numColors; i++) {
    const r = clusters[i * 4];
    const g = clusters[i * 4 + 1];
    const b = clusters[i * 4 + 2];

    const closestDMCColor = findClosestDMCColor(r, g, b);
    clusterDMCColors.push(closestDMCColor);

    clusters[i * 4] = closestDMCColor.r / 255;
    clusters[i * 4 + 1] = closestDMCColor.g / 255;
    clusters[i * 4 + 2] = closestDMCColor.b / 255;
    // Keep the original alpha value
  }
  savedColors = clusterDMCColors;

  // Apply new colors
  colorData = new Float32Array(currWidth * currHeight * 4);
  for (let i = 0; i < assignments.length; i++) {
    const cluster = assignments[i];
    colorData.set(clusters.subarray(cluster * 4, cluster * 4 + 4), i * 4);
  }
  return colorData;
}

// #####################################
// ########### Public Functions ########
// #####################################

export function initPicture(pixelData, dimX, dimY) {
  // Map pixelData from 0-255 to 0-1 floats
  const mappedPixelData = new Float32Array(pixelData.length);
  for (let i = 0; i < pixelData.length; i++) {
    mappedPixelData[i] = pixelData[i] / 255;
  }
  imageWidth = dimX;
  imageHeight = dimY;
  pictureData = mappedPixelData;
}

// get the image data and paint initial canvas rendering
export function drawGrid(count, numColors) {
  if (count == null) {
    count = currWidth;
  }
  if (numColors == null) {
    numColors = currColors;
  }
  let positions = _setNewSize(count);
  let colorData = _setNewColors(numColors);
  _redraw(positions, colorData);
}

export function clearGrid() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  pictureData = new Float32Array(0);
}

export function save() {
  generatePDF(currHeight, currWidth, savedColors, finalImageData, colorData);
}
