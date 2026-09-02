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
//   y     — height in meters (your eyes are at 1.6)
//   color — material family
// ---------------------------------------------------------------

const nature = {

  // the ground itself
  "lakeside lakeshore":  { y: 0.05, color: "#6d8494" },
  "sandbar sand bar":    { y: 0.05, color: "#b9a882" },
  "patio terrace":       { y: 0.08, color: "#8f8b85" },

  // small things lying on it
  "croquet ball":        { y: 0.10, color: "#a8674f" },
  "safety pin":          { y: 0.06, color: "#9aa0a6" },
  "rapeseed":            { y: 0.70, color: "#9fae5c" },

  // furniture and body height
  "park bench":          { y: 0.45, color: "#8a6b4a" },
  "pedestal plinth footstall": { y: 0.80, color: "#8f8b85" },
  "sundial":             { y: 0.90, color: "#9d8b62" },
  "crutch":              { y: 1.00, color: "#9aa0a6" },
  "stone wall":          { y: 1.00, color: "#8f8b85" },
  "worm fence snake fence snake-rail fence Virginia fence":
                         { y: 1.10, color: "#8a6b4a" },
  "unicycle monocycle":  { y: 1.10, color: "#9aa0a6" },
  "golfcart golf cart":  { y: 1.20, color: "#9aa0a6" },
  "bow":                 { y: 1.40, color: "#8a6b4a" },
  "fountain":            { y: 1.40, color: "#6d8494" },
  "maze labyrinth":      { y: 1.60, color: "#4f4a52" },

  // above you
  "horse cart horse-cart": { y: 1.80, color: "#8a6b4a" },
  "swing":               { y: 2.20, color: "#8a6b4a" },
  "mobile home manufactured home": { y: 3.20, color: "#8f8b85" },
  "pole":                { y: 4.50, color: "#9aa0a6" },

  // roofs
  "tile roof":           { y: 6.00, color: "#a5735f" },
  "thatch thatched roof":{ y: 6.50, color: "#b5a06a" },
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
  return nature[point.label] || { y: 1.6, color: "#787878" };
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
  const jitterZ = random(-1, 1);
  const spin = random(-10, 10);
  const size = 2;
  const facing = 180;
  const padding = 1;

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${point.x + jitterX} ${profile.y + padding} ${point.z + jitterZ}`);
  el.setAttribute("rotation", `0 ${spin + facing} 0`);
  el.setAttribute("scale", `${size} ${size} ${size}`);
  el.setAttribute("align", "center");
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
