// ===============================================================
// EXAMPLE 6 — NAVIGATION AND GAMIFICATION
//
// Every example so far has been a thing to look at. This one is a
// thing to do. The 89 classifications are strung along a spiral
// that opens 12m around you and winds outward, and walking within
// reach of a word marks it. A counter in front of you keeps score.
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
// classification sits nearest the center, the last one on the
// outermost turn.
//
// t runs 0 to 1 across the dataset. From it we get an angle (how
// far around) and a radius (how far out), and sin/cos turn that
// pair into x and z.
// ---------------------------------------------------------------

const TURNS = 2;      // how many times the spiral goes around
const R_MIN = 12;     // radius of the first word
const R_MAX = 40;     // radius of the last one
const Y_MIN = 1.0;    // everything stays within reach: no flying
const Y_MAX = 2.6;

function spiralPosition(index, total) {
  const t = index / (total - 1);
  const angle = t * TURNS * 2 * Math.PI;
  const radius = R_MIN + t * (R_MAX - R_MIN);

  return {
    x: Math.sin(angle) * radius,
    y: Y_MIN + t * (Y_MAX - Y_MIN),
    z: Math.cos(angle) * radius,
    angle: angle,
  };
}


// ---------------------------------------------------------------
// STEP 3 — one label. Each one turns to face the center of the
// spiral, so they are readable from where you start and keep
// turning towards you as you wind outward.
//
// items[] is the list the game logic reads: the element plus the
// place it stands, and whether it has been reached yet.
// ---------------------------------------------------------------

const SIZE = 1.6;
const COLOR = "#6f6a78";
const HIT_COLOR = "#d98b4a";

const items = [];

function makeLabel(point, index, total) {
  const el = document.createElement("a-text");
  const spot = spiralPosition(index, total);

  // face the middle: text points along +z by default, so turning
  // it by the spiral angle plus 180 aims it back at the origin
  const facing = (spot.angle * 180) / Math.PI + 180;

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
// attached; tick() runs every single frame, forever.
//
// Every frame we ask where the camera is in the world and compare
// it to each word still standing. Anything closer than REACH is
// marked.
// ---------------------------------------------------------------

const REACH = 1.6;

AFRAME.registerComponent("collector", {

  init: function () {
    this.camera = document.querySelector("[camera]");
    this.here = new THREE.Vector3();
    this.hud = document.getElementById("hud");
    this.hits = 0;
    this.report();
  },

  report: function () {
    const done = this.hits === items.length ? "  —  complete" : "";
    this.hud.setAttribute("value", `${this.hits} / ${items.length}${done}`);
  },

  tick: function () {
    this.camera.object3D.getWorldPosition(this.here);

    for (const item of items) {
      if (item.hit) continue;

      const dx = this.here.x - item.x;
      const dy = this.here.y - item.y;
      const dz = this.here.z - item.z;

      if (Math.hypot(dx, dy, dz) < REACH) {
        item.hit = true;
        item.el.setAttribute("color", HIT_COLOR);
        this.hits++;
        this.report();
      }
    }
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
