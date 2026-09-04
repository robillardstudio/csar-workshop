# CSAR Workshop

**Gaëtan Robillard** · Computational Semiotics Lab · 2026

![screenshot](screenshot-example-1.png)
*csar workshop — example 1*

---

This repository holds the in-class workshop materials for building a **first-person, browser-based visualization of machine-vision classification data**, using [A-Frame](https://aframe.io) and a CSV log collected from a live, on-device object classifier (MobileNetV4, running in-browser via ONNX/WebGPU) walked through the Oval at OSU.

The exercise sits inside a larger research question: machine vision systems impose a fixed, categorical vocabulary onto whatever they see, and that vocabulary rarely matches the place it's describing. Rather than reading that mismatch as a table of numbers, the workshop reprojects the classifier's own output — its words, and how confident it was in each one — back into a walkable 3D space, so the gap between what the model says and what is actually there becomes something you move through rather than something you read about.

No prior 3D, WebXR, or web development experience is assumed beyond the p5.js fundamentals (functions, data, basic OOP) covered earlier in the course.

---

## Examples

Each folder is a self-contained scene — `index.html`, `script.js`, and its own `data.csv`.

**Examples 1 and 2** are the workshop's teaching progression, each adding one idea to the last. **Examples 3 to 8** come after the workshop: each one develops a single typology drawn from what the student groups actually built, taking one interpretive move as far as it will go.

### Live pages

Served from `https://robillardstudio.github.io/csar-workshop/`

| Typology | Live page |
| :--- | :--- |
| starting pattern — data in the script | [example-1/](https://robillardstudio.github.io/csar-workshop/example-1/) |
| external CSV and randomness | [example-2/](https://robillardstudio.github.io/csar-workshop/example-2/) |
| **Naturalism** | [example-3/](https://robillardstudio.github.io/csar-workshop/example-3/) |
| **Semantic clustering** | [example-4/](https://robillardstudio.github.io/csar-workshop/example-4/) |
| **Repetition** | [example-5/](https://robillardstudio.github.io/csar-workshop/example-5/) |
| **Navigation and gamification** | [example-6/](https://robillardstudio.github.io/csar-workshop/example-6/) |
| **Remapping data** | [example-7/](https://robillardstudio.github.io/csar-workshop/example-7/) |
| **Mood / atmospheric** | [example-8/](https://robillardstudio.github.io/csar-workshop/example-8/) |

### Coding workshop progression

**`example-1`** — the data lives directly in the script as an array of objects, the same shape used in the p5.js OOP unit. This is the version to read first: one function turns a single data point into a visible label, and a loop calls it once per point. No file I/O, no randomness — just the core pattern.

**`example-2`** — the array is replaced with a `fetch()` of an external CSV (same pattern as `loadTable()` in p5.js), and each label gets a small random position offset and rotation so the field doesn't read as a rigid grid. It ships with a tiny placeholder `data.csv`; swapping in `data-csar-oval.csv` (rename it to `data.csv`, or edit the `fetch()` path in `script.js`) replaces the placeholder points with the real, cleaned Oval Park walk.

### Six typologies

**`example-3` — Naturalism.** A hand-written lookup table supplies the world knowledge the classifier does not have: how high off the ground each thing named would actually be. `lakeside lakeshore` sits at 5cm, `park bench` at 45cm, `thatch thatched roof` at 6.5m. The walk itself is untouched — x and z still come from the GPS track — so only the vertical axis and the colour are authored. Any label missing from the table falls back to eye height in grey, which makes the table's incompleteness visible rather than hidden.

**`example-4` — Semantic clustering.** Six categories the model can never output (`GROUND / LANDSCAPE`, `BOUNDARY / ENCLOSURE`, `SHELTER / ROOF`, …) are declared by hand, and the code inverts that list into a label-to-category lookup. Position stops being geography entirely: recorded coordinates are parsed and discarded, and every label travels to its category's meeting point on an arc 30m out, with the category name floating above it. Confidence drives size. An empty `UNSORTED` slot catches anything the taxonomy has no room for.

**`example-5` — Repetition.** The dataset is counted before anything is drawn. Words then sort into lanes across x by how often they occur — the eleven words seen exactly once share one lane, `lakeside lakeshore` stands alone at fifteen — while z comes straight from the CSV. The repetition is therefore the real one: nothing is deduplicated or synthesised, so a word the model kept returning genuinely keeps reappearing along the length of the recorded walk.

**`example-6` — Navigation and gamification.** The scene becomes something to do rather than look at. All 89 classifications wind up a helix at constant radius, climbing from 1m to 24m, so `wasd-controls` runs with `fly: true` and reaching the top means learning to steer in three dimensions. An A-Frame component with a `tick()` handler — the first real behaviour in the series, and A-Frame's answer to p5's `draw()` — marks any word within 5m and keeps score on a HUD attached to the camera.

**`example-7` — Remapping data.** Every visual channel is one line in a single `channels` block, with the line it replaced commented directly beneath it, so rewiring the whole scene is a two-line edit. As shipped it hijacks depth: z no longer means where on the Oval but how sure the model was, with doubt collecting at your feet and the few confident readings standing 70m off. A third commented option runs the same values through a square root, showing that the *shape* of a mapping is construct rarely notices at first glance.

**`example-8` — Mood / atmospheric.** Runs on one derived number: how many words a label contains. ImageNet stores categories as synonym lists, and `clean.py` strips the commas, so `worm fence snake fence snake-rail fence Virginia fence` arrives as one breathless string — a semantic gap measurable without any ground truth. Word count scales the *amplitude* of every property rather than its value, so one-word readings render identically on every reload while the stammering ones wobble in size, tilt, and glare pale out of the murk. The scene itself changes here for the first time: dark, and fogged down to about 25m of visibility against a 96m walk.

---

## Running a scene

All the examples are plain static files — no build step. `fetch()` of the CSV only works when the page is served over `http`, so **double-clicking `index.html` will not work**. Easiest options:

- Open the files in the [p5 web editor](https://editor.p5js.org/)
- Or serve them locally: `python3 -m http.server` from inside the folder, then visit `http://localhost:8000`
- Or use the live pages linked above

Controls in-scene: drag to look around, WASD to move. `example-6` adds flying.

---

## Data pipeline

`data/clean.py` takes the raw classifier export and produces the file the A-Frame scenes actually read. It does three things, each switchable at the top of the script:

- **Keeps only the top-ranked prediction per frame** — the raw log records the classifier's top 3 guesses for every frame; the cleaning step drops ranks 2 and 3, keeping only what the model was most confident about.
- **Removes duplicate points** (`REMOVE_LATLON_DUPLICATES`) — consecutive frames at (near-)identical GPS coordinates collapse to a single row per unique (lat, lon, label) combination, so a person standing still doesn't produce dozens of stacked labels.
- **Converts GPS to local meters** (`USE_LOCAL_XZ`) — latitude/longitude aren't usable as A-Frame world coordinates directly; this reprojects them to flat x/z offsets in meters from the first recorded point, using a flat-earth approximation that's accurate enough at the scale of a short walk.

It also strips commas out of label text (some raw labels come back as `"maze, labyrinth"`), since a comma inside a field would otherwise be mistaken for a column separator once quoting is turned off — the same stripping that `example-8` reads as evidence.

---

## Datasheets

`data/datasheet.py` builds a short datasheet for every recorded walk, so that sites can be compared on the same terms. It reads the **raw** logs rather than the cleaned ones, because two of the more useful measures need columns `clean.py` discards — the rank-2 confidence and `gps_accuracy`.

```
python3 datasheet.py             # every site listed in sites.csv
python3 datasheet.py oval-park   # just one
```

Context that cannot be computed — site name, weather, time of day, what the route was — is written by hand in `data/sites.csv`, one row per walk. Everything else is derived. This split follows the *Datasheets for Datasets* convention (Gebru et al., 2021): recorded context alongside measured properties.

Each run writes into `data/datasheets/`:

| File | |
| :--- | :--- |
| [`oval-park.md`](data/datasheets/oval-park.md) · [`indianola.md`](data/datasheets/indianola.md) | readable summary — capture, geography, vocabulary, model behaviour |
| `oval-park.json` · `indianola.json` | the same figures plus full confidence percentiles and margin quartiles |
| `sites-comparison.csv` | one flat row per site, for analysis across walks |