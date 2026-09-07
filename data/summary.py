"""
Collect a short cross-site summary from the datasheets.

This reads the JSON sidecars written by datasheet.py rather than the raw
logs, so there is only one place where a metric is ever computed and the
summary can never quietly disagree with the individual datasheets. Run
datasheet.py first.

A handful of figures per site, nothing else:

    model, duration, path length, labels distinct,
    labels distinct / path length, top label,
    confidence median, rank1-rank2 margin median

Writes datasheets/summary.md and prints the same table.

Usage:
    python3 summary.py
"""

import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).parent
SITES_FILE = HERE / "sites.csv"
OUT_DIR = HERE / "datasheets"
OUT_FILE = OUT_DIR / "summary.md"

def labels_per_metre(d):
    """Distinct labels divided by distance walked.

    Raw distinct-label counts are not comparable between walks of very
    different length: a longer walk has more chances to turn up a new
    word. Dividing by path length asks a fairer question — how much fresh
    vocabulary did a metre of this place cost the model?

    Only a partial correction. New labels do not accumulate linearly with
    distance — they saturate, as the model exhausts the categories a
    place can suggest — so this still favours short walks. Treat it as an
    order of magnitude, not a coefficient.
    """
    labels = d["vocabulary"]["labels_distinct"]
    metres = d["geography"]["path_length_m"]
    return round(labels / metres, 4) if metres else None


# label shown in the table, and where to find it in the sidecar
FIELDS = [
    ("model", lambda d: d["capture"]["model"]),
    ("duration", lambda d: f'{d["capture"]["duration_s"]} s'),
    ("path length", lambda d: f'{d["geography"]["path_length_m"]} m'),
    ("labels distinct", lambda d: d["vocabulary"]["labels_distinct"]),
    ("labels distinct / path length", lambda d: f"{labels_per_metre(d)} /m"),
    ("top label", lambda d: f'`{d["vocabulary"]["top_labels"][0]["label"]}`'),
    ("confidence, median", lambda d: d["model"]["confidence_p50"]),
    ("rank1−rank2 margin, median", lambda d: d["model"]["margin_p50"]),
]


def site_order():
    """Site ids in the order sites.csv lists them, falling back to whatever
    sidecars happen to exist."""
    if SITES_FILE.exists():
        listed = pd.read_csv(SITES_FILE)["site_id"].tolist()
        return [s for s in listed if (OUT_DIR / f"{s}.json").exists()]
    return sorted(p.stem for p in OUT_DIR.glob("*.json"))


def main():
    ids = site_order()
    if not ids:
        print("No datasheets found. Run datasheet.py first.")
        return

    sheets = [json.loads((OUT_DIR / f"{sid}.json").read_text()) for sid in ids]
    names = [s["site"].get("site_name") or s["site"].get("site_id") for s in sheets]

    # Metrics run down the rows and sites across the columns: the model id
    # and the top label are long strings, and they sit far better in a
    # column than stretched across one. Transpose this if the number of
    # sites ever outgrows the page width.
    header = "| | " + " | ".join(names) + " |"
    rule = "| :--- | " + " | ".join("---:" for _ in names) + " |"

    lines = [header, rule]
    for label, get in FIELDS:
        lines.append(f"| {label} | " + " | ".join(str(get(s)) for s in sheets) + " |")

    table = "\n".join(lines)
    text = f"# Site summary\n\n{table}\n"

    OUT_DIR.mkdir(exist_ok=True)
    OUT_FILE.write_text(text)

    print(table)
    print(f"\n-> {OUT_FILE.relative_to(HERE)} ({len(ids)} sites)")


if __name__ == "__main__":
    main()
