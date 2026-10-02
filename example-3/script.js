// ===============================================================
// EXAMPLE 3 — NATURALISM
//
// In example-2 every label sat at eye height and its size came
// from the classifier's confidence. Here we ask a different
// question: if this word were true, where would the thing it
// names actually be? A "park bench" belongs at bench height, a
// "thatched roof" overhead, "lakeside" underfoot.
//
// The classifier only has strings. The world knowledge below is
// supplied by hand.
// ===============================================================


// ---------------------------------------------------------------
// STEP 1 — the data, same external CSV as example-2.
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
// STEP 2 — a lookup table: an object you search by name instead
// of by number. For each label:
//   y        — height in meters (your eyes are at 1.6)
//   rotation — roll in degrees. A label is a flat plane, so facing
//              the camera (0) reads as a broad, flat thing — a
//              terrace, a roof, a wall of a building. Turned 90,
//              it's seen edge-on and collapses to a thin vertical
//              stroke — the silhouette of a pole, a bench back, a
//              fence rail: anything thin and standing.
//   rotationY — extra yaw in degrees, on top of facing. 90 for
//              things that move under their own wheels — a cart,
//              a unicycle — so they sit angled across the path
//              instead of squared up to the camera like everything
//              that just stays put.
//   size     — scale multiplier. Not confidence this time — the
//              real-world bulk of the thing. A rapeseed and a
//              mobile home don't get to be the same size just
//              because the classifier was equally sure about both.
//   color    — material family
// ---------------------------------------------------------------

const nature = {

  // the ground itself — broad and flat, face the camera
  "lakeside lakeshore":  { y: 0, rotation: 0, rotationX: -90, rotationY: 90, size: 8.0, color: "#6d8494" },
  "sandbar sand bar":    { y: 0, rotation: 0, rotationX: -90, rotationY: 0, size: 3.5, color: "#b9a882" },
  "patio terrace":       { y: 0.08, rotation: 0, rotationX: -90, rotationY: 0, size: 6, color: "#8f8b85" },

  // small things lying on it
  "croquet ball":        { y: 0.10, rotation: 0, rotationX: 0, rotationY: 0, size: 0.5, color: "#a8674f" },
  "safety pin":          { y: 0.06, rotation: 0, rotationX: 0, rotationY: 0, size: 0.4, color: "#9aa0a6" },
  "rapeseed":            { y: 0.70, rotation: 0, rotationX: 0, rotationY: 0, size: 0.3, color: "#9fae5c" },

  // furniture and body height — thin, standing things seen edge-on
  "park bench":          { y: 0.45, rotation: 0, rotationX: -90, rotationY: 0, size: 1.5, color: "#8a6b4a" },
  "pedestal plinth footstall": { y: 0.80, rotation: 0, rotationX: 0, rotationY: 0, size: 1.5, color: "#8f8b85" },
  "sundial":             { y: 0.90, rotation: 0, rotationX: 0, rotationY: 0, size: 1.0, color: "#9d8b62" },
  "crutch":              { y: 1.00, rotation: 90, rotationX: 0, rotationY: 0, size: 1.0, color: "#9aa0a6" },
  "stone wall":          { y: 1.00, rotation: 90, rotationX: 0, rotationY: 0, size: 3.0, color: "#8f8b85" },
  "worm fence snake fence snake-rail fence Virginia fence":
                         { y: 0.9, rotation: 0, rotationX: 0, rotationY: 0, size: 3.0, color: "#8a6b4a" },
  "unicycle monocycle":  { y: 1.10, rotation: 0, rotationX: 0, rotationY: 90, size: 1.2, color: "#9aa0a6" },
  "golfcart golf cart":  { y: 1.20, rotation: 0, rotationX: 0, rotationY: 90, size: 2.0, color: "#9aa0a6" },
  "bow":                 { y: 1.40, rotation: 0, rotationX: 0, rotationY: 0, size: 1.0, color: "#8a6b4a" },
  "fountain":            { y: 1.40, rotation: 90, rotationX: 0, rotationY: 0, size: 2.5, color: "#6d8494" },
  "maze labyrinth":      { y: 1.60, rotation: 0, rotationX: 0, rotationY: 0, size: 2.0, color: "#4f4a52" },

  // above you
  "horse cart horse-cart": { y: 1.80, rotation: 0, rotationX: 0, rotationY: 90, size: 2.5, color: "#8a6b4a" },
  "swing":               { y: 2.20, rotation: 90, rotationX: 0, rotationY: 0, size: 1.8, color: "#8a6b4a" },
  "mobile home manufactured home": { y: 4, rotation: 0, rotationX: 0, rotationY: 0, size: 5.0, color: "#8f8b85" },
  "pole":                { y: 3, rotation: 90, rotationX: 0, rotationY: 0, size: 3, color: "#9aa0a6" },

  // roofs — broad sloped planes, face the camera
  "tile roof":           { y: 6.00, rotation: 0, rotationX: 45, rotationY: 0, size: 5.0, color: "#a5735f" },
  "thatch thatched roof":{ y: 6.50, rotation: 0, rotationX: 45, rotationY: 0, size: 5.0, color: "#b5a06a" },
};


// ---------------------------------------------------------------
// STEP 3 — look a label up. Anything the table doesn't know falls
// back to eye height in gray: those are the words we couldn't
// place.
// ---------------------------------------------------------------

function random(min, max) {
  return min + Math.random() * (max - min);
}

function naturalize(point) {
  return nature[point.label] || { y: 1.6, rotation: 0, rotationX: 0, rotationY: 0, size: 1.5, color: "#787878" };
}


// ---------------------------------------------------------------
// STEP 4 — one data point, one label. x and z still come from the
// GPS track; only the height and color are authored.
// ---------------------------------------------------------------

function makeLabel(point) {
  const el = document.createElement("a-text");
  const profile = naturalize(point);

  // small jitter, so the vertical layering is what reads
  const jitterX = random(-2, 2);
  const jitterZ = random(-2, 2);
  const jitterY = random(-0.1, 0.1);
  const facing = 180;
  const padding = 1;

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${point.x + jitterX} ${profile.y + padding + jitterY} ${point.z + jitterZ}`);
  el.setAttribute("rotation", `${profile.rotationX} ${facing + profile.rotationY} ${profile.rotation}`);
  el.setAttribute("scale", `${profile.size} ${profile.size} ${profile.size}`);
  el.setAttribute("align", "left");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");
  el.setAttribute("color", profile.color);

  return el;
}


// ---------------------------------------------------------------
// STEP 5 — build the scene.
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
