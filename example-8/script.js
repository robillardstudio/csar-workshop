// ===============================================================
// EXAMPLE 8 — MOOD / ATMOSPHERIC
//
// Look at what the classifier actually returns:
//
//   "pole"
//   "maze labyrinth"
//   "worm fence snake fence snake-rail fence Virginia fence"
//
// The last one is a single classification. ImageNet stores that
// category as a list of synonyms, and clean.py stripped the
// commas out so the whole list arrives as one breathless string.
// The model is not describing a fence four times over — it simply
// has no single name for it.
//
// That stammer is a semantic gap you can measure without any
// ground truth at all: just count the words. One word means the
// vocabulary had somewhere confident to put what it saw. Eight
// words means it did not.
//
// So here word count drives mood. Steady one-word readings hold
// still and stay legible; the stammering ones wobble in size,
// drift in color, tilt slightly, breathe in and out, and sink
// toward the fog. Nothing is mapped to confidence or geography —
// the unease comes from the vocabulary itself.
//
// The scene is also darker and much foggier than the earlier
// examples. You can only see about 25m, so the walk has to be
// discovered a few meters at a time.
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
// STEP 2 — helpers, plus the one number this example runs on.
//
// unease() turns a label into 0..1 by counting its words. In this
// dataset the count runs from 1 ("pole", "swing", "fountain") to
// 8 (the fence). Everything below is scaled by it.
// ---------------------------------------------------------------

function map(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

const MIN_WORDS = 1;
const MAX_WORDS = 8;

function unease(label) {
  const words = label.split(" ").length;
  return map(words, MIN_WORDS, MAX_WORDS, 0, 1);
}


// ---------------------------------------------------------------
// STEP 3 — the atmosphere settings. Each one is an amount of
// wobble, not a value: how far this property is allowed to stray
// once unease is taken into account. Turn any of them to 0 and
// that channel goes quiet.
// ---------------------------------------------------------------

const BASE_SIZE = 2.0;
const SIZE_WOBBLE = 1.2;     // how much bigger or smaller it can land

const BASE_HUE = 250;        // cold blue-violet
const HUE_WANDER = 45;       // how far the hue can drift either way

const ROLL = 4;              // degrees of tilt off vertical
const FACING = 180;

const DRIFT_MIN = 0.05;      // how far it rises and falls, in meters
const DRIFT_MAX = 0.6;
const BREATH_SLOW = 7000;    // milliseconds for a steady word
const BREATH_FAST = 2800;    // ... and for a stammering one


// ---------------------------------------------------------------
// STEP 4 — one data point, one label. x and z come straight from
// the recorded walk: the place is still the place. Everything
// else is weather.
// ---------------------------------------------------------------

function makeLabel(point) {
  const el = document.createElement("a-text");
  const u = unease(point.label);

  const y = 1.6 + random(-0.3, 0.3);

  // size: steady words land near BASE_SIZE, stammering ones can
  // come out much larger or much smaller — and differently on
  // every reload
  const size = +(BASE_SIZE + random(-1, 1) * u * SIZE_WOBBLE).toFixed(2);

  // color: the hue wanders further the longer the label, while
  // saturation and lightness both fall, so the worst stammers are
  // the hardest to pick out of the fog
  const hue = +(BASE_HUE + random(-1, 1) * u * HUE_WANDER).toFixed(1);
  const saturation = map(u, 0, 1, 26, 8).toFixed(0);
  const lightness = map(u, 0, 1, 66, 42).toFixed(0);

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${point.x} ${y} ${point.z}`);
  el.setAttribute("rotation", `0 ${FACING + random(-8, 8)} ${random(-1, 1) * u * ROLL}`);
  el.setAttribute("scale", `${size} ${size} ${size}`);
  el.setAttribute("align", "center");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");
  el.setAttribute("color", `hsl(${hue}, ${saturation}%, ${lightness}%)`);

  // breathing. A-Frame's animation component is declarative — one
  // attribute, no code to run each frame. dir: alternate makes it
  // go back and forth forever; the random delay keeps the whole
  // field from breathing in unison.
  const drift = map(u, 0, 1, DRIFT_MIN, DRIFT_MAX);
  const breath = map(u, 0, 1, BREATH_SLOW, BREATH_FAST);

  el.setAttribute(
    "animation",
    `property: object3D.position.y;
     from: ${y};
     to: ${y + drift};
     dur: ${breath.toFixed(0)};
     delay: ${random(0, 3000).toFixed(0)};
     dir: alternate;
     loop: true;
     easing: easeInOutSine`
  );

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
