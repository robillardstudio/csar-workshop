// ===============================================================
// EXAMPLE 6 — NAVIGATION AND GAMIFICATION
//
// Every example so far has been a thing to look at. This one is a
// thing to do. The 89 classifications are strung along a spiral
// that rises around you like a staircase with no steps. Aim the
// crosshair at a word close enough to touch and click it, and it
// changes color. A counter in front of you keeps score.
//
// Nothing about the data changed. What changed is that reading it
// now costs you something — you have to walk the whole spiral to
// see all of it, and the order you meet the words in is fixed by
// the shape rather than chosen by you.
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
// STEP 2 — the spiral. Instead of x and z from the CSV, position
// comes from how far through the walk a reading is: the first
// classification sits at ground level and the last one at the top,
// with the whole dataset winding up the wall of a cylinder.
//
// t runs 0 to 1 across the dataset. The radius never changes —
// only the angle (how far around) and the height (how far up).
// sin/cos turn the angle into x and z.
// ---------------------------------------------------------------

const TURNS = 3;      // how many times the spiral goes around
const RADIUS = 14;    // same distance from the center all the way up
const Y_MIN = 1.0;    // height of the first word
const Y_MAX = 24;     // height of the last one — you have to fly

function spiralPosition(index, total) {
  const t = index / (total - 1);
  const angle = t * TURNS * 2 * Math.PI;

  return {
    x: Math.sin(angle) * RADIUS,
    y: Y_MIN + t * (Y_MAX - Y_MIN),
    z: Math.cos(angle) * RADIUS,
    angle: angle,
  };
}


// ---------------------------------------------------------------
// STEP 3 — one label. Each one turns to face the center of the
// spiral, so they stay readable from the middle of the cylinder
// as you climb.
//
// items[] is the list the game logic reads: the element plus the
// place it stands, and whether it has been reached yet.
// ---------------------------------------------------------------

const SIZE = 1.6;
const COLOR = "#6f6a78";
const HOVER_COLOR = "#a89ab8";
const HIT_COLOR = "#d98b4a";

const items = [];

function makeLabel(point, index, total) {
  const el = document.createElement("a-text");
  const spot = spiralPosition(index, total);

  // face the middle: text points along +z by default, so turning
  // it by the spiral angle plus 180 aims it back at the origin
  const facing = (spot.angle * 180) / Math.PI + 180;

  // the crosshair only looks for things in this class, which is
  // how the counter in front of your face avoids being clickable
  el.setAttribute("class", "word");

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${spot.x} ${spot.y} ${spot.z}`);
  el.setAttribute("rotation", `0 ${facing} 0`);
  el.setAttribute("scale", `${SIZE} ${SIZE} ${SIZE}`);
  el.setAttribute("align", "center");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");
  el.setAttribute("color", COLOR);

  items.push({ el: el, x: spot.x, y: spot.y, z: spot.z, hit: false });

  return el;
}


// ---------------------------------------------------------------
// STEP 4 — the game. This is an A-Frame component: a small piece
// of behaviour attached to an entity. init() runs once when it is
// attached.
//
// The crosshair in the middle of your view fires events at
// whatever it is pointing at — mouseenter when it lands on a word,
// mouseleave when it slides off, click when you press. Those
// events travel up to the scene, so one listener here catches all
// 89 words instead of 89 separate listeners.
//
// The crosshair only reaches 6m (see the raycaster in index.html),
// so a word has to be flown to before it can be clicked.
// ---------------------------------------------------------------

AFRAME.registerComponent("collector", {

  init: function () {
    this.hud = document.getElementById("hud");
    this.hits = 0;
    this.report();

    this.el.addEventListener("click", (event) => this.hit(event.target));
    this.el.addEventListener("mouseenter", (event) => this.hover(event.target, true));
    this.el.addEventListener("mouseleave", (event) => this.hover(event.target, false));
  },

  find: function (el) {
    return items.find((item) => item.el === el);
  },

  hover: function (el, isOver) {
    const item = this.find(el);
    if (!item || item.hit) return;
    item.el.setAttribute("color", isOver ? HOVER_COLOR : COLOR);
  },

  hit: function (el) {
    const item = this.find(el);
    if (!item || item.hit) return;

    item.hit = true;
    item.el.setAttribute("color", HIT_COLOR);
    this.hits++;
    this.report();
  },

  report: function () {
    const done = this.hits === items.length ? "  —  complete" : "";
    this.hud.setAttribute("value", `${this.hits} / ${items.length}${done}`);
  },
});


// ---------------------------------------------------------------
// STEP 5 — build the scene, then switch the game on. The
// component is attached last, once every word exists and items[]
// is complete.
// ---------------------------------------------------------------

async function build() {
  const points = await loadData();
  const field = document.getElementById("field");

  points.forEach((point, index) => {
    field.appendChild(makeLabel(point, index, points.length));
  });

  document.querySelector("a-scene").setAttribute("collector", "");
}

build();
