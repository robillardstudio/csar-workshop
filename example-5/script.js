// ===============================================================
// EXAMPLE 5 — REPETITION
//
// The classifier said "lakeside lakeshore" fifteen times and
// "bow" once. In examples 1 to 4 that difference was invisible:
// every row of the CSV became one label, scattered somewhere, and
// a word repeated fifteen times just looked like fifteen unrelated
// words.
//
// Here nothing is discarded and nothing is summarised. Every
// occurrence is drawn, and copies of the same word stack on top
// of each other. Frequency becomes height — a column you have to
// look up at.
//
// The floor plan is two sortings at once: alphabetical order
// across x, frequency rank into z. Neither is geography.
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
// STEP 2 — counting. This is the new step: before drawing
// anything we read the whole dataset once and ask how often each
// word appears.
//
// counts        — { "park bench": 13, "bow": 1, ... }
// alphabetical  — the words sorted A to Z
// byFrequency   — the same words sorted most common first
//
// These are filled in by analyse(), which runs after the CSV
// loads. They start empty because we cannot count data we have
// not read yet.
// ---------------------------------------------------------------

let counts = {};
let alphabetical = [];
let byFrequency = [];

function analyse(points) {
  counts = {};

  for (const point of points) {
    counts[point.label] = (counts[point.label] || 0) + 1;
  }

  alphabetical = Object.keys(counts).sort();
  byFrequency = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
}


// ---------------------------------------------------------------
// STEP 3 — the layout. Each word gets one column, and the column
// is placed by where the word falls in the two sortings.
//
//   x — alphabetical position, centered on the origin
//   z — frequency rank: the most common word stands closest
//   y — one step per copy, so the column grows as it repeats
//
// Because the two sortings disagree, the field is not a straight
// line. A word that is alphabetically early but rare ends up far
// left and far away.
// ---------------------------------------------------------------

const SPACING_X = 3.5;   // gap between neighbours in the alphabet
const SPACING_Z = 2.5;   // gap between one frequency rank and the next
const NEAR = 12;         // distance to the most frequent word
const BASE = 1.2;        // height of the first copy
const STEP = 1.1;        // height added by each repeat
const SIZE = 1.5;
const FACING = 180;

function map(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}


// ---------------------------------------------------------------
// STEP 4 — one copy of one word. floor says which repeat this is:
// 0 for the first time the word appeared, 1 for the second, and
// so on up the column.
// ---------------------------------------------------------------

function makeCopy(label, floor) {
  const el = document.createElement("a-text");

  const alphaIndex = alphabetical.indexOf(label);
  const rankIndex = byFrequency.indexOf(label);

  const x = (alphaIndex - (alphabetical.length - 1) / 2) * SPACING_X;
  const z = NEAR + rankIndex * SPACING_Z;
  const y = BASE + floor * STEP;

  // common words darker, rare words pale
  const most = counts[byFrequency[0]];
  const lightness = map(counts[label], 1, most, 68, 38);

  el.setAttribute("value", label);
  el.setAttribute("position", `${x} ${y} ${z}`);
  el.setAttribute("rotation", `0 ${FACING} 0`);
  el.setAttribute("scale", `${SIZE} ${SIZE} ${SIZE}`);
  el.setAttribute("align", "center");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");
  el.setAttribute("color", `hsl(255, 22%, ${lightness}%)`);

  return el;
}


// ---------------------------------------------------------------
// STEP 5 — build the scene. seen[] remembers how many copies of
// each word we have already placed, which gives us the floor
// number for the next one.
// ---------------------------------------------------------------

async function build() {
  const points = await loadData();
  const field = document.getElementById("field");
  const seen = {};

  analyse(points);

  for (const point of points) {
    const floor = seen[point.label] || 0;
    seen[point.label] = floor + 1;
    field.appendChild(makeCopy(point.label, floor));
  }
}

build();
