// ===============================================================
// EXEMPLE 3 — NATURALISM
//
// In exemple-2 every label sat at the same height (1.6m, your eye
// level) and its size came from one number: the classifier's
// confidence. The data decided everything; the words themselves
// decided nothing.
//
// Naturalism reverses that. A "park bench" belongs at bench
// height. A "thatched roof" belongs above your head. "lakeside"
// is not an object standing in front of you at all — it is the
// ground you are walking on. So instead of mapping a number to a
// position, we ask: if this word were true, where would the thing
// it names actually be?
//
// The classifier has no idea what any of its words mean. It only
// has strings. Here WE supply the missing world knowledge, by
// hand, in a lookup table — and the gap between the model's
// vocabulary and the place you are standing in becomes something
// you can see by looking up and down.
// ===============================================================


// ---------------------------------------------------------------
// STEP 1 — the data. Identical to exemple-2: an external CSV with
// columns x,z,label,confidence, fetched at page load.
//
// NOTE: fetch() only works when the page is served over http —
// Glitch does this for you. Double-clicking index.html will NOT
// work.
// ---------------------------------------------------------------

async function loadData() {
  const response = await fetch("data.csv");
  const text = await response.text();
  return parseCSV(text);
}

function parseCSV(text) {
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
// STEP 2 — THE NEW IDEA: a table of world knowledge.
//
// This is a plain JavaScript object used as a dictionary: you look
// something up by its name instead of by a number index. Every key
// is a label that actually appears in the dataset; every value
// describes where that thing lives in the world.
//
//   y     — height in meters. Remember your eyes are at 1.6.
//   scale — how big the word is drawn, based on how big the THING
//           is, not on how sure the model was.
//   color — a family: earth, vegetation, stone, timber, metal, sky.
//   flat  — true for things that ARE the ground rather than things
//           standing on it. Those labels lie down on the surface.
//   tilt  — degrees of pitch, for sloping things like roofs.
//
// Read down the y column and you are reading a section drawing of
// the site: ground, furniture, body, structure, roof.
// ---------------------------------------------------------------

const nature = {

  // --- THE GROUND ITSELF: lies flat, you walk over the word ---
  "lakeside lakeshore":  { y: 0.02, scale: 3.0, color: "#6d8494", flat: true },
  "sandbar sand bar":    { y: 0.02, scale: 2.2, color: "#b9a882", flat: true },
  "patio terrace":       { y: 0.03, scale: 2.0, color: "#8f8b85", flat: true },
  "maze labyrinth":      { y: 0.04, scale: 2.6, color: "#4f4a52", flat: true },

  // --- SMALL THINGS DROPPED ON THE GROUND: low, small, upright ---
  "croquet ball":        { y: 0.10, scale: 0.5, color: "#a8674f" },
  "safety pin":          { y: 0.06, scale: 0.4, color: "#9aa0a6" },
  "rapeseed":            { y: 0.70, scale: 0.9, color: "#9fae5c" },

  // --- FURNITURE AND BODY SCALE: at or below your eyeline ---
  "park bench":          { y: 0.45, scale: 1.2, color: "#8a6b4a" },
  "pedestal plinth footstall": { y: 0.80, scale: 1.0, color: "#8f8b85" },
  "sundial":             { y: 0.90, scale: 0.9, color: "#9d8b62" },
  "crutch":              { y: 1.00, scale: 0.8, color: "#9aa0a6" },
  "stone wall":          { y: 1.00, scale: 1.6, color: "#8f8b85" },
  "worm fence snake fence snake-rail fence Virginia fence":
                         { y: 1.10, scale: 1.4, color: "#8a6b4a" },
  "unicycle monocycle":  { y: 1.10, scale: 0.8, color: "#9aa0a6" },
  "golfcart golf cart":  { y: 1.30, scale: 1.1, color: "#9aa0a6" },
  "bow":                 { y: 1.40, scale: 0.7, color: "#8a6b4a" },
  "fountain":            { y: 1.50, scale: 1.4, color: "#6d8494" },

  // --- ABOVE YOU: hung, tall, or built ---
  "horse cart horse-cart": { y: 1.80, scale: 1.3, color: "#8a6b4a" },
  "swing":               { y: 2.20, scale: 1.0, color: "#8a6b4a" },
  "mobile home manufactured home": { y: 3.20, scale: 2.4, color: "#8f8b85" },
  "pole":                { y: 4.50, scale: 1.0, color: "#9aa0a6" },

  // --- ROOFS: high overhead, and pitched like the thing they name ---
  "tile roof":           { y: 6.00, scale: 1.8, color: "#a5735f", tilt: -22 },
  "thatch thatched roof":{ y: 6.50, scale: 1.8, color: "#b5a06a", tilt: -22 },
};


// ---------------------------------------------------------------
// STEP 3 — helpers.
//
// map() and random() are the same as before. naturalize() is new:
// it looks a label up in the table and always returns a usable
// profile, even for a word the table has never heard of.
//
// That fallback matters. It is the honest part of this example:
// our world knowledge is hand-written and incomplete, so any label
// we did not anticipate drops back to the exemple-2 behaviour —
// floating at eye height, sized by confidence, colored a dead
// gray. Those gray words hovering at 1.6m are exactly the words
// we could not place.
// ---------------------------------------------------------------

function map(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function naturalize(point) {
  const known = nature[point.label];

  if (known) {
    return {
      y: known.y,
      scale: known.scale,
      color: known.color,
      flat: known.flat === true,
      tilt: known.tilt || 0,
    };
  }

  // unknown label — behave like exemple-2 and admit it
  return {
    y: 1.6,
    scale: map(point.confidence, 0, 1, 0.6, 2.0),
    color: "#787878",
    flat: false,
    tilt: 0,
  };
}


// ---------------------------------------------------------------
// STEP 4 — one data point becomes one label, now placed by
// meaning rather than by measurement.
//
// x and z still come straight from the GPS track, so the walk is
// still the walk. Only the vertical axis and the appearance are
// authored. Confidence has not disappeared — it moved to opacity,
// so a guess the model barely committed to shows up as a faint
// word rather than a small one.
// ---------------------------------------------------------------

function makeLabel(point) {
  const el = document.createElement("a-text");
  const profile = naturalize(point);

  // small horizontal jitter only — much smaller than exemple-2,
  // because here we want the vertical layering to be what reads,
  // not the scatter
  const jitterX = random(-0.4, 0.4);
  const jitterZ = random(-0.4, 0.4);

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${point.x + jitterX} ${profile.y} ${point.z + jitterZ}`);
  el.setAttribute("align", "center");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");

  // ORIENTATION carries meaning too:
  //   flat things lie on the ground, face up (-90 on the x axis)
  //   roofs get a pitch
  //   everything else stands upright, turned a little at random
  if (profile.flat) {
    el.setAttribute("rotation", `-90 ${random(0, 360)} 0`);
  } else {
    el.setAttribute("rotation", `${profile.tilt} ${random(-25, 25)} 0`);
  }

  el.setAttribute("scale", `${profile.scale} ${profile.scale} ${profile.scale}`);
  el.setAttribute("color", profile.color);

  // confidence -> opacity (0.35 = barely committed, 1 = certain).
  // Most of this dataset sits under 0.2, so expect a faint field.
  el.setAttribute("opacity", map(point.confidence, 0, 0.85, 0.35, 1).toFixed(2));

  return el;
}


// ---------------------------------------------------------------
// STEP 5 — same loop as always.
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


// ---------------------------------------------------------------
// THINGS TO TRY
//
// 1. Walk the path and look only UP, then walk it again looking
//    only DOWN. You are reading two different site descriptions
//    out of the same classifier output.
//
// 2. Change one entry in the nature table — put "park bench" at
//    y: 5. How quickly does the scene stop feeling like a place?
//
// 3. Add a label the table doesn't know (edit data.csv) and find
//    the gray word floating at eye height.
//
// 4. Argue with the table. Is "maze labyrinth" really the ground?
//    Is "fountain" 1.5m? Every value here is an interpretation
//    someone made, and yours would produce a different Oval.
// ---------------------------------------------------------------
