// ---------------------------------------------------------------
// STEP 1 — the data.
// Same shape as the arrays of objects from the p5 OOP unit.
// x and z are positions on the ground (x = left/right, z =
// forward/back — forward is negative z in A-Frame). y is height,
// set later. confidence is a number between 0 and 1.
// ---------------------------------------------------------------

const points = [
  { x: 1,  z: -2, label: "maze",         confidence: 0.1 },
  { x: 2,  z: -3, label: "park bench",   confidence: 0.31 },
  { x: -1, z: -6, label: "lakeside",     confidence: 0.27 },
  { x: 3,  z: -9, label: "viaduc",       confidence: 0.55 },
  { x: -2, z: -12, label: "fountain",     confidence: 0.38 },
  { x: 1,  z: -13, label: "pole",         confidence: 0.9 },
];

// ---------------------------------------------------------------
// STEP 2 — a tiny helper, exactly like p5's map().
// map(value, inMin, inMax, outMin, outMax)
// ---------------------------------------------------------------

function map(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

// ---------------------------------------------------------------
// STEP 3 — a function that turns ONE data point into ONE visible
// text label. This plays the same role as the constructor you
// wrote for a class in the OOP unit: data goes in, something
// that knows how to appear on screen comes out. The difference
// from p5: there's no draw() loop to write yourself. A-Frame
// redraws every element on screen automatically, every frame,
// forever — you only describe what should exist and where.
// ---------------------------------------------------------------

function makeLabel(point) {
  const el = document.createElement("a-text");

  el.setAttribute("value", point.label);
  el.setAttribute("position", `${point.x} 1.6 ${point.z}`);
  el.setAttribute("align", "center");
  el.setAttribute("width", "6");
  el.setAttribute("side", "double");

  // confidence -> size, same idea as mapping a value to a
  // circle's diameter in p5
  const size = map(point.confidence, 0, 1, 0.5, 10);
  el.setAttribute("scale", `${size} ${size} ${size}`);

  // confidence -> color, gray (unsure) fading to orange (confident)
  const brightness = map(point.confidence, 0, 1, 70, 45);
  el.setAttribute("color", `hsl(270, 60%, ${brightness}%)`);

  return el;
}

// ---------------------------------------------------------------
// STEP 4 — loop over the data, make one label per point, add it
// to the scene. Same pattern as looping over an array of objects
// and calling .display() on each one — except here, "adding it
// to the scene" IS the display step. Nothing more to write.
// ---------------------------------------------------------------

const field = document.getElementById("field");

for (const point of points) {
  const label = makeLabel(point);
  field.appendChild(label);
}