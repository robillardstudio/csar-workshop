// ---------------------------------------------------------------
// STEP 1 — the data, now loaded from an external CSV file instead
// of typed directly into this script. Same idea as p5's
// loadTable() — the shape of the data (an array of objects) does
// not change, only where it comes from.
//
// data.csv must sit in the same folder as this file, with columns:
//   x,z,label,confidence
//
// NOTE: fetch() of a local file only works when this page is
// served over http — Glitch does this automatically. Opening
// index.html by double-clicking it will NOT work: the browser
// blocks fetch() of local files for security reasons.
// ---------------------------------------------------------------

async function loadData() {
  const response = await fetch("data-csar-oval.csv");
  const text = await response.text();
  return parseCSV(text);
}

function parseCSV(text) {
  // trim() each line to drop stray \r (Windows line endings) and
  // filter out any blank lines — a common leftover from hand-editing
  // or exporting a CSV from Excel/Sheets.
  const lines = text.trim().split("\n").map((line) => line.trim());
  const rows = lines.slice(1).filter((line) => line.length > 0); // skip header + blanks
  return rows.map((line) => {
    const [x, z, label, confidence] = line.split(",");
    return {
      x: parseFloat(x),
      z: parseFloat(z),
      label: label.trim(),
      confidence: parseFloat(confidence),
    };
  });
}

// ---------------------------------------------------------------
// STEP 2 — helpers. map() as before, plus random() — a direct
// equivalent of p5's random(min, max).
// ---------------------------------------------------------------

function map(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

// ---------------------------------------------------------------
// STEP 3 — turn one data point into one label. What's new
// compared to the very first version: each label now gets a
// small random offset in x/z (so the field doesn't look like a
// perfect grid) and a random rotation around the vertical axis
// (so labels face different directions, as if dropped rather
// than placed). Run the page twice and the layout won't be
// identical either time — that's the point of using random().
// ---------------------------------------------------------------

function makeLabel(point) {
  const el = document.createElement("a-text");

  const jitterX = random(-0.6, 0.6);
  const jitterZ = random(-0.6, 0.6);
  const spin = random(0, 45);
  const coef = 10

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${point.x + jitterX * coef} 1.6 ${point.z + jitterZ * coef}`);
  el.setAttribute("rotation", `0 ${spin} 0`);
  el.setAttribute("align", "center");
  el.setAttribute("width", "6");
  // font attribute
  el.setAttribute("side", "double");
  // el.setAttribute("font", "dejavu");

  // confidence -> size, same idea as mapping a value to a
  // circle's diameter in p5
  const size = map(point.confidence, 0, 1, 0.6, 10);
  el.setAttribute("scale", `${size} ${size} ${size}`);

  // confidence -> color, gray (unsure) fading to orange (confident)
  const brightness = map(point.confidence, 0, 1, 70, 45);
  el.setAttribute("color", `hsl(270, 60%, ${brightness}%)`);

  return el;
}

// ---------------------------------------------------------------
// STEP 4 — same loop as before, now driven by the loaded CSV.
// loadData() has to wait for the file to download, so building
// the scene happens inside its own async function.
// ---------------------------------------------------------------

async function build() {
  const points = await loadData();
  const field = document.getElementById("field");

  for (const point of points) {
    const label = makeLabel(point);
    field.appendChild(label);
  }
}

build();