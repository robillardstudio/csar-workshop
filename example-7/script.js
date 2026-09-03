// ===============================================================
// EXAMPLE 7 — REMAPPING DATA
//
// A dataset does not tell you what to draw. Between the numbers
// and the scene there is a set of decisions — which column drives
// which visual property — and those decisions are usually made
// once, early, and then forgotten.
//
// This example pulls them out into the open. Every visual channel
// is one line in one place, and under each one sits the line it
// replaced, commented out. Uncomment a line, comment the one
// above it, and the same 89 readings describe something else.
//
// The version below hijacks depth. z no longer means "where on
// the Oval": it means "how sure the model was". Doubt collects
// around you and certainty stands at a distance — the further a
// word is, the more the model meant it. Since it is unsure about
// almost everything, you start inside a crowd of guesses with a
// few convictions scattered far off in the fog, and reaching them
// means walking away from everything else. x still carries real
// geography, so half the scene is a map and half of it is a mood.
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
// STEP 2 — helpers, unchanged.
// ---------------------------------------------------------------

function map(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

// confidence in this dataset never goes above 0.85 and mostly sits
// under 0.2. Mapping from 0 to 1 would leave most of every range
// unused — all the words the same size, all the same color. Every
// mapping below runs against the real maximum instead.
const MAX_C = 0.85;


// ---------------------------------------------------------------
// STEP 3 — THE MAPPINGS. One line per visual channel: what goes
// in on the right, what comes out on the left.
//
// Each pair is a fork in the road. The active line is the version
// this example runs; the line commented out beneath it is the
// version from the earlier examples. Swapping them is the whole
// exercise — nothing else in the file needs to change.
// ---------------------------------------------------------------

const channels = {

  // LEFT / RIGHT — still the recorded walk
  x: (p) => p.x,
  // x: (p) => map(p.confidence, 0, MAX_C, -20, 20),   // confidence instead

  // HEIGHT — flat, everything at eye level
  y: (p) => 1.6,
  // y: (p) => map(p.confidence, 0, MAX_C, 0.2, 12),   // confidence instead

  // DEPTH — remapped: no longer where, but how sure. Low
  // confidence lands at your feet, high confidence far away.
  //
  // Expect a lopsided field. The model is unsure about almost
  // everything it saw, so most of the words pile up in the first
  // few meters and only a handful stand out in the distance. That
  // imbalance is not a bug in the mapping, it is what the data
  // says.
  //
  // The third line is a different fix for the same fact: putting
  // the values through a square root pushes the crowded low end
  // apart. Which field drives a channel is one decision; the
  // shape of the mapping is another.
  z: (p) => map(p.confidence, 0, MAX_C, 5, 70),
  // z: (p) => p.z,                                    // the real walk
  // z: (p) => map(Math.sqrt(p.confidence), 0, Math.sqrt(MAX_C), 5, 70),

  // SIZE
  size: (p) => map(p.confidence, 0, MAX_C, 0.8, 5),
  // size: (p) => 2,                                   // one size for all

  // COLOR — hue and saturation both driven by confidence, so an
  // unsure reading comes out gray and a certain one saturated
  hue: (p) => map(p.confidence, 0, MAX_C, 0, 300),
  sat: (p) => map(p.confidence, 0, MAX_C, 0, 90),
  // hue: (p) => 255,                                  // one fixed hue
  // sat: (p) => 22,
};


// ---------------------------------------------------------------
// STEP 4 — one data point, one label. Notice that this function
// no longer decides anything: it just asks the channels above.
// ---------------------------------------------------------------

const JITTER_X = 2;
const JITTER_Z = 5;   // wider, to loosen the crowd of unsure words
const FACING = 180;

function makeLabel(point) {
  const el = document.createElement("a-text");

  // many readings share almost the same confidence, so without a
  // nudge they would pile up on the same spot
  const x = channels.x(point) + random(-JITTER_X, JITTER_X);
  const y = channels.y(point);
  const z = channels.z(point) + random(-JITTER_Z, JITTER_Z);

  const size = channels.size(point);
  const spin = random(-10, 10);

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${x} ${y} ${z}`);
  el.setAttribute("rotation", `0 ${spin + FACING} 0`);
  el.setAttribute("scale", `${size} ${size} ${size}`);
  el.setAttribute("align", "center");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");
  el.setAttribute("color", `hsl(${channels.hue(point)}, ${channels.sat(point)}%, 50%)`);

  return el;
}


// ---------------------------------------------------------------
// STEP 5 — build the scene.
// ---------------------------------------------------------------

async function build() {
  const points = await loadData();
  const field = document.getElementById("field");

  for (const point of points) {
    field.appendChild(makeLabel(point));
  }
}

build();
