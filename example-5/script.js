// ===============================================================
// EXAMPLE 5 — REPETITION
//
// The classifier said "lakeside lakeshore" fifteen times and
// "bow" once. In the earlier examples that difference was
// invisible: every row of the CSV became one label, and a word
// repeated fifteen times just looked like fifteen unrelated
// words.
//
// Here the repetition is the real one. Nothing is deduplicated
// and nothing is invented: every occurrence is drawn at the z it
// was actually recorded at, so a word the model kept returning
// keeps coming back at you as you walk down the track.
//
// Across x, the words sort themselves into lanes by how often
// they occur — rare on one side, insistent on the other.
// ===============================================================


// ---------------------------------------------------------------
// STEP 1 — the data, same external CSV as before.
// fetch() needs the page served over http (Glitch does this).
// ---------------------------------------------------------------

async function loadData() {
  const response = await fetch("data.csv");
  const text = await response.text();
  return parseCSV(text);
}

function parseCSV(text) {
  const lines = text.trim().split("\n").map((line) => line.trim());
  const rows = lines.slice(1).filter((line) => line.length > 0);
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
// STEP 2 — counting. Before drawing anything we read the whole
// dataset once and ask how often each word appears.
//
// counts       — { "park bench": 13, "bow": 1, ... }
// mostCommon   — the highest of those numbers, used to center the
//                lanes and to scale the color
//
// They start empty because we cannot count data we have not read
// yet; analyse() fills them once the CSV has loaded.
// ---------------------------------------------------------------

let counts = {};
let mostCommon = 1;

function analyse(points) {
  counts = {};

  for (const point of points) {
    counts[point.label] = (counts[point.label] || 0) + 1;
  }

  mostCommon = Math.max(...Object.values(counts));
}


// ---------------------------------------------------------------
// STEP 3 — the layout.
//
//   x — frequency. Every word that occurs the same number of
//       times shares a lane, so all the words seen only once
//       line up together at one edge of the field.
//   z — straight from the CSV: where the classifier actually said
//       it. This is the only axis still carrying the walk.
//   y — a small random height, purely so two words recorded close
//       together don't land on exactly the same spot.
// ---------------------------------------------------------------

const SPACING_X = 2.5;     // gap between one frequency lane and the next
const Y_MIN = 1;
const Y_MAX = 3;
const SIZE = 1.5;
const FACING = 180;

function map(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}


// ---------------------------------------------------------------
// STEP 4 — one row of the CSV, one label. There is no counter to
// keep here: the repetition looks after itself, because the data
// already contains every occurrence.
// ---------------------------------------------------------------

function makeCopy(point) {
  const el = document.createElement("a-text");
  const count = counts[point.label];

  const x = (count - (1 + mostCommon) / 2) * SPACING_X;

  // common words darker, rare words pale
  const lightness = map(count, 1, mostCommon, 68, 38);

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${x} ${random(Y_MIN, Y_MAX)} ${point.z}`);
  el.setAttribute("rotation", `0 ${FACING} 0`);
  el.setAttribute("scale", `${SIZE} ${SIZE} ${SIZE}`);
  el.setAttribute("align", "left");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");
  el.setAttribute("color", `hsl(255, 22%, ${lightness}%)`);

  return el;
}


// ---------------------------------------------------------------
// STEP 5 — build the scene.
// ---------------------------------------------------------------

async function build() {
  const points = await loadData();
  const field = document.getElementById("field");

  analyse(points);

  for (const point of points) {
    field.appendChild(makeCopy(point));
  }
}

build();
