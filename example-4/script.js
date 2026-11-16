// ===============================================================
// EXAMPLE 4 — SEMANTIC CLUSTERING
//
// The classifier returns 23 different words for one walk across
// the Oval. On their own they are a flat list: no word knows it
// has anything to do with any other. Here we impose a taxonomy —
// a small set of categories the model never produced — and let
// that grouping decide where things stand.
//
// The walk dissolves. Instead of following the GPS track, each
// label leaves its recorded position and joins its category.
// Space stops being geography and becomes classification.
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
// STEP 2 — the taxonomy. Each category has a color and a list of
// the classifier labels that belong to it.
//
// The category names are new vocabulary: "BOUNDARY / ENCLOSURE"
// is not something the model can output. It is our word for a
// family of its words.
// ---------------------------------------------------------------

const taxonomy = {

  "GROUND / LANDSCAPE": {
    color: "#7d9a6d",
    labels: [
      "lakeside lakeshore",
      "sandbar sand bar",
      "patio terrace",
      "rapeseed",
    ],
  },

  "BOUNDARY / ENCLOSURE": {
    color: "#b08d57",
    labels: [
      "worm fence snake fence snake-rail fence Virginia fence",
      "stone wall",
      "maze labyrinth",
    ],
  },

  "SHELTER / ROOF": {
    color: "#a5735f",
    labels: [
      "thatch thatched roof",
      "tile roof",
      "mobile home manufactured home",
    ],
  },

  "STREET FURNITURE": {
    color: "#6d8494",
    labels: [
      "park bench",
      "swing",
      "fountain",
      "sundial",
      "pedestal plinth footstall",
      "pole",
    ],
  },

  "VEHICLES": {
    color: "#8f7da8",
    labels: [
      "golfcart golf cart",
      "horse cart horse-cart",
      "unicycle monocycle",
    ],
  },

  "HELD OBJECTS": {
    color: "#c08a7a",
    labels: [
      "crutch",
      "bow",
      "croquet ball",
      "safety pin",
    ],
  },

  // anything the taxonomy has no room for ends up here
  "UNSORTED": {
    color: "#787878",
    labels: [],
  },
};


// ---------------------------------------------------------------
// STEP 3 — two things built from the taxonomy.
//
// category  — turns the list-per-category above inside out, so we
//             can ask "which group does this label belong to?"
// centers   — one meeting point per category, spread on an arc in
//             front of where you start.
// ---------------------------------------------------------------

const RADIUS = 30;   // how far the clusters sit from the origin
const SPREAD = 8;    // how loosely labels gather around their center

function map(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

const category = {};
for (const name in taxonomy) {
  for (const label of taxonomy[name].labels) {
    category[label] = name;
  }
}

const names = Object.keys(taxonomy);
const centers = {};
names.forEach((name, i) => {
  const angle = map(i, 0, names.length - 1, -70, 70) * (Math.PI / 180);
  centers[name] = {
    x: Math.sin(angle) * RADIUS,
    z: Math.cos(angle) * RADIUS,
  };
});


// ---------------------------------------------------------------
// STEP 4 — one data point, one label. point.x and point.z are
// read from the CSV and then thrown away: position now comes from
// the category, scattered in a circle around its center.
// point.confidence survives, as size.
//
// Note the range we map against. Confidence here tops out around
// 0.85 and most predictions sit under 0.2, so mapping from 0 to 1
// would squash nearly every word to the same small size. Mapping
// against the real maximum spreads the cluster out instead.
// ---------------------------------------------------------------

const MAX_CONFIDENCE = 0.85;
const SIZE_MIN = 1.2;
const SIZE_MAX = 4;
const FACING = 180;

function makeLabel(point) {
  const el = document.createElement("a-text");
  const name = category[point.label] || "UNSORTED";
  const center = centers[name];

  // polar scatter: pick a direction, then a distance
  const angle = random(0, 360) * (Math.PI / 180);
  const distance = random(0, SPREAD);
  const spin = random(-10, 10);

  // confidence -> size
  const size = map(point.confidence, 0, MAX_CONFIDENCE, SIZE_MIN, SIZE_MAX);

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${center.x + Math.sin(angle) * distance} ${random(1, 4.5)} ${center.z + Math.cos(angle) * distance}`);
  el.setAttribute("rotation", `0 ${spin + FACING} 0`);
  el.setAttribute("scale", `${size} ${size} ${size}`);
  el.setAttribute("align", "center");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");
  el.setAttribute("color", taxonomy[name].color);

  return el;
}

// the category name itself, floating above its cluster
const HEADING_SIZE = 5;

function makeHeading(name) {
  const el = document.createElement("a-text");
  const center = centers[name];

  el.setAttribute("value", name);
  el.setAttribute("position", `${center.x} 7 ${center.z}`);
  el.setAttribute("rotation", `0 ${FACING} 0`);
  el.setAttribute("scale", `${HEADING_SIZE} ${HEADING_SIZE} ${HEADING_SIZE}`);
  el.setAttribute("align", "center");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");
  el.setAttribute("color", taxonomy[name].color);

  return el;
}


// ---------------------------------------------------------------
// STEP 5 — build the scene. Headings are only drawn for
// categories that actually caught something.
// ---------------------------------------------------------------

async function build() {
  const points = await loadData();
  const field = document.getElementById("field");
  const used = {};

  for (const point of points) {
    const name = category[point.label] || "UNSORTED";
    used[name] = true;
    field.appendChild(makeLabel(point));
  }

  for (const name in used) {
    field.appendChild(makeHeading(name));
  }
}

build();
