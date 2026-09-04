"""
Build a datasheet for each recorded walk.

Reads the RAW classifier logs — not the cleaned ones — because two of the
most useful measures need columns clean.py discards: the rank-2 confidence
(for the decision margin) and gps_accuracy.

For every row in sites.csv this writes three things into datasheets/:

    <site_id>.json   machine-readable, for later analysis
    <site_id>.md     human-readable, renders on GitHub
    sites-comparison.csv   one flat row per site, all sites together

Provenance that cannot be computed (weather, light, what the route was)
lives in sites.csv and is copied through untouched. Everything else is
derived here. This split follows the "Datasheets for Datasets" convention
(Gebru et al., 2021): recorded context alongside measured properties.

Usage:
    python3 datasheet.py            # every site in sites.csv
    python3 datasheet.py oval-park  # just one
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).parent
SITES_FILE = HERE / "sites.csv"
OUT_DIR = HERE / "datasheets"

EARTH_RADIUS_M = 6378137.0

# Local time offset used for the human-readable start time.
# Columbus OH is UTC-4 in summer (EDT), UTC-5 in winter (EST).
TZ_OFFSET_HOURS = -4

# The confidence percentiles reported for every site. These replace a
# single "low confidence rate": the threshold for such a rate has to be
# chosen arbitrarily, and the result moves a lot depending on where it is
# put. Percentiles describe the same distribution without that choice.
PERCENTILES = [10, 25, 50, 75, 90]

# Rates below fixed thresholds are still reported, because "a third of
# frames were guesses" communicates in a way quartiles do not — but all
# three are given so the sensitivity to the threshold stays visible.
LOW_CONF_THRESHOLDS = [0.05, 0.10, 0.20]


# ---------------------------------------------------------------------
# metrics
# ---------------------------------------------------------------------

def capture_metrics(df, top1):
    """How the recording was made: device, model, sampling, GPS quality."""
    duration_s = (df["timestamp"].max() - df["timestamp"].min()) / 1000.0
    start_utc = pd.to_datetime(df["timestamp"].min(), unit="ms", utc=True)
    start_local = start_utc + pd.Timedelta(hours=TZ_OFFSET_HOURS)

    return {
        "frames": int(len(top1)),
        "rows_all_ranks": int(len(df)),
        "ranks_per_frame": int(df["rank"].max()),
        "start_utc": start_utc.isoformat(),
        "start_local": start_local.strftime("%Y-%m-%d %H:%M:%S"),
        "tz_offset_hours": TZ_OFFSET_HOURS,
        "duration_s": round(duration_s, 1),
        "frames_per_s": round(len(top1) / duration_s, 2) if duration_s else None,
        "gps_accuracy_median_m": round(float(df["gps_accuracy"].median()), 1),
        "gps_accuracy_max_m": round(float(df["gps_accuracy"].max()), 1),
        "inference_ms_median": int(df["inference_ms"].median()),
        "model": str(df["model"].iloc[0]),
        "dtype": str(df["dtype"].iloc[0]),
        "backend": str(df["device"].iloc[0]),
        "frame_size": f'{int(df["frame_w"].iloc[0])}x{int(df["frame_h"].iloc[0])}',
    }


def geography_metrics(top1):
    """Where the walk happened and how far it went.

    Median lat/lon is the site fingerprint — robust to a stray fix in a
    way the mean is not. Extents and path length use the same flat-earth
    projection as clean.py so the numbers agree with the scenes.
    """
    lat0 = float(top1["lat"].median())
    m_per_deg_lat = (math.pi / 180.0) * EARTH_RADIUS_M
    m_per_deg_lon = m_per_deg_lat * math.cos(math.radians(lat0))

    x = (top1["lon"] - top1["lon"].iloc[0]) * m_per_deg_lon
    z = -(top1["lat"] - top1["lat"].iloc[0]) * m_per_deg_lat

    # GPS updates far more slowly than the classifier runs, so most
    # consecutive frames share a coordinate. Step statistics are computed
    # on the distinct fixes only; path length is unaffected either way.
    fixes = top1[["lat", "lon"]].drop_duplicates()
    fx = (fixes["lon"] - top1["lon"].iloc[0]) * m_per_deg_lon
    fz = -(fixes["lat"] - top1["lat"].iloc[0]) * m_per_deg_lat
    steps = np.hypot(fx.diff(), fz.diff()).dropna()

    return {
        "lat_median": round(lat0, 6),
        "lon_median": round(float(top1["lon"].median()), 6),
        "lat_min": round(float(top1["lat"].min()), 6),
        "lat_max": round(float(top1["lat"].max()), 6),
        "lon_min": round(float(top1["lon"].min()), 6),
        "lon_max": round(float(top1["lon"].max()), 6),
        "extent_x_m": round(float(x.max() - x.min()), 1),
        "extent_z_m": round(float(z.max() - z.min()), 1),
        "path_length_m": round(float(steps.sum()), 1),
        "unique_gps_fixes": int(len(fixes)),
        "gps_fix_ratio": round(len(fixes) / len(top1), 3),
        "step_median_m": round(float(steps.median()), 2) if len(steps) else None,
    }


def model_metrics(df, top1):
    """How sure the classifier was, and how decisively it chose.

    The margin is the gap between the best guess and the runner-up on the
    same frame. It is independent of the absolute confidence scale: a
    small margin means two unrelated categories were nearly tied, so the
    label that surfaced was close to arbitrary.
    """
    conf = top1["confidence"]

    ranked = df.pivot_table(index="timestamp", columns="rank", values="confidence")
    margin = (ranked[1] - ranked[2]).dropna() if 2 in ranked.columns else pd.Series(dtype=float)

    out = {
        "confidence_mean": round(float(conf.mean()), 3),
        "confidence_max": round(float(conf.max()), 3),
    }
    for q in PERCENTILES:
        out[f"confidence_p{q}"] = round(float(conf.quantile(q / 100)), 3)

    if len(margin):
        out["margin_p25"] = round(float(margin.quantile(0.25)), 3)
        out["margin_p50"] = round(float(margin.median()), 3)
        out["margin_p75"] = round(float(margin.quantile(0.75)), 3)

    for t in LOW_CONF_THRESHOLDS:
        out[f"below_{t:.2f}".replace(".", "")] = round(float((conf < t).mean()), 3)

    return out


def vocabulary_metrics(top1, top_n=5):
    """What the model said, and how varied its vocabulary was.

    Entropy is reported both raw and normalised by its own maximum. The
    raw figure grows with the number of distinct labels, so it is not
    comparable between walks of different length; the normalised one —
    evenness — is, and is the figure to use when comparing sites.

    Word count treats an ImageNet synonym list ("worm fence, snake fence,
    snake-rail fence, Virginia fence") as one label of many words. Note
    that a long list signals how finely that region of the label space was
    subdivided, NOT how uncertain the model was — the two can move in
    opposite directions.
    """
    labels = top1["label"]
    shares = labels.value_counts(normalize=True)
    counts = labels.value_counts()

    n_distinct = int(labels.nunique())
    entropy = float(-(shares * np.log2(shares)).sum())
    entropy_max = math.log2(n_distinct) if n_distinct > 1 else 0.0

    words = labels.str.replace(",", "", regex=False).str.split().str.len()

    return {
        "labels_distinct": n_distinct,
        "type_token_ratio": round(n_distinct / len(labels), 3),
        "entropy_bits": round(entropy, 2),
        "entropy_max_bits": round(entropy_max, 2),
        "evenness": round(entropy / entropy_max, 3) if entropy_max else None,
        "top5_share": round(float(shares.head(5).sum()), 3),
        "words_per_label_mean": round(float(words.mean()), 2),
        "words_per_label_max": int(words.max()),
        "multiword_share": round(float((words > 2).mean()), 3),
        "top_labels": [
            {"label": str(k), "count": int(counts[k]), "share": round(float(v), 3)}
            for k, v in shares.head(top_n).items()
        ],
    }


# ---------------------------------------------------------------------
# assembly and output
# ---------------------------------------------------------------------

def build(site):
    raw_path = HERE / site["raw_file"]
    df = pd.read_csv(raw_path)
    top1 = df[df["rank"] == 1].copy()

    return {
        "site": {k: ("" if pd.isna(v) else str(v)) for k, v in site.items()},
        "source": {
            "raw_file": site["raw_file"],
            "raw_rows": int(len(df)),
        },
        "capture": capture_metrics(df, top1),
        "geography": geography_metrics(top1),
        "model": model_metrics(df, top1),
        "vocabulary": vocabulary_metrics(top1),
    }


def rows(d, keys=None):
    """Turn a flat dict into markdown table rows."""
    items = d.items() if keys is None else ((k, d[k]) for k in keys if k in d)
    return "\n".join(f"| {k.replace('_', ' ')} | {v} |" for k, v in items)


def to_markdown(sheet):
    s, cap, geo, mod, voc = (
        sheet["site"], sheet["capture"], sheet["geography"],
        sheet["model"], sheet["vocabulary"],
    )

    top = "\n".join(
        f"| {i + 1} | `{t['label']}` | {t['count']} | {t['share']} |"
        for i, t in enumerate(voc["top_labels"])
    )

    notes = "\n".join(
        f"**{k.replace('_', ' ').title()}** — {v}"
        for k, v in s.items()
        if k not in ("raw_file", "site_id") and v
    )

    return f"""# {s.get('site_name', s.get('site_id'))}

`{s.get('site_id')}` · {cap['start_local']} (UTC{TZ_OFFSET_HOURS:+d}) · {cap['duration_s']} s

{notes}

Source: [`{sheet['source']['raw_file']}`](../{sheet['source']['raw_file']}) — {sheet['source']['raw_rows']} rows, {cap['frames']} frames x {cap['ranks_per_frame']} ranks.

## Capture

| | |
| :--- | ---: |
{rows(cap, ['frames', 'duration_s', 'frames_per_s', 'gps_accuracy_median_m', 'gps_accuracy_max_m', 'inference_ms_median', 'frame_size'])}

Model `{cap['model']}`, {cap['dtype']} on {cap['backend']}.

## Geography

| | |
| :--- | ---: |
{rows(geo)}

> GPS updates more slowly than the classifier runs, so only {geo['unique_gps_fixes']} of
> {cap['frames']} frames carry a distinct coordinate (ratio {geo['gps_fix_ratio']}).
> Per-metre spatial claims should be read against that figure.

## Vocabulary

| | |
| :--- | ---: |
{rows(voc, ['labels_distinct', 'type_token_ratio', 'entropy_bits', 'entropy_max_bits',
            'evenness', 'top5_share', 'words_per_label_mean', 'words_per_label_max',
            'multiword_share'])}

Use `evenness` rather than `entropy_bits` to compare sites: raw entropy grows
with the number of distinct labels and so tracks walk length as much as
vocabulary spread.

## Most frequent labels

| # | label | count | share |
| ---: | :--- | ---: | ---: |
{top}

## Model behaviour

| | |
| :--- | ---: |
| confidence, median | {mod['confidence_p50']} |
| rank1−rank2 margin, median | {mod['margin_p50']} |
| "no idea" rate (top-1 < 0.1) | {mod['below_010']} |

**Confidence, median** — the typical score behind the winning label. Scores are
a softmax over 1000 classes, so they run low everywhere; read this as a relative
figure between sites, not as a probability of being right.

**Rank1−rank2 margin, median** — the gap between the best guess and the runner-up
on the same frame. A small margin means two unrelated categories were nearly
tied, so the label that surfaced was close to arbitrary.

**"No idea" rate** — the share of frames whose winning label scored under 0.1.
The threshold is a convention, not a principled cut; the full percentile and
threshold ranges are in `{s.get('site_id')}.json` for anything load-bearing.
"""


def flatten(sheet):
    flat = {"site_id": sheet["site"].get("site_id"),
            "site_name": sheet["site"].get("site_name")}
    for group in ("capture", "geography", "model", "vocabulary"):
        for k, v in sheet[group].items():
            if k == "top_labels":
                flat["top_label"] = v[0]["label"] if v else None
                flat["top_label_share"] = v[0]["share"] if v else None
            else:
                flat[f"{group[:3]}_{k}"] = v
    return flat


def main():
    wanted = sys.argv[1] if len(sys.argv) > 1 else None

    sites = pd.read_csv(SITES_FILE)
    OUT_DIR.mkdir(exist_ok=True)

    flat_rows = []
    for _, site in sites.iterrows():
        if wanted and site["site_id"] != wanted:
            continue
        if not (HERE / site["raw_file"]).exists():
            print(f"  ! missing {site['raw_file']}, skipped")
            continue

        sheet = build(site)
        sid = site["site_id"]

        (OUT_DIR / f"{sid}.json").write_text(json.dumps(sheet, indent=2))
        (OUT_DIR / f"{sid}.md").write_text(to_markdown(sheet))
        flat_rows.append(flatten(sheet))

        print(f"  {sid}: {sheet['capture']['frames']} frames, "
              f"{sheet['vocabulary']['labels_distinct']} labels, "
              f"evenness {sheet['vocabulary']['evenness']}")

    if flat_rows:
        comparison = OUT_DIR / "sites-comparison.csv"
        if wanted and comparison.exists():
            # updating one site: keep the other rows
            old = pd.read_csv(comparison)
            old = old[old["site_id"] != wanted]
            out = pd.concat([old, pd.DataFrame(flat_rows)], ignore_index=True)
        else:
            out = pd.DataFrame(flat_rows)
        out.sort_values("site_id").to_csv(comparison, index=False)
        print(f"  -> {comparison.name} ({len(out)} sites)")


if __name__ == "__main__":
    main()
