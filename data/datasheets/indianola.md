# Indianola Avenue

`indianola` · 2026-08-28 08:29:29 (UTC-4) · 127.2 s

**Site Name** — Indianola Avenue
**City** — Columbus OH
**Setting** — residential street, small city center with parked cars and street furniture
**Weather** — sunny, mild
**Route Note** — early morning, few people, car traffic

Source: [`live-detection_20260828-083140_raw.csv`](../live-detection_20260828-083140_raw.csv) — 492 rows, 164 frames x 3 ranks.

## Capture

| | |
| :--- | ---: |
| frames | 164 |
| duration s | 127.2 |
| frames per s | 1.29 |
| gps accuracy median m | 14.1 |
| gps accuracy max m | 21.8 |
| inference ms median | 73 |
| frame size | 480x640 |

Model `onnx-community/mobilenetv4_conv_small.e2400_r224_in1k`, fp16 on webgpu.

## Geography

| | |
| :--- | ---: |
| lat median | 40.025328 |
| lon median | -83.001543 |
| lat min | 40.024421 |
| lat max | 40.02615 |
| lon min | -83.00178 |
| lon max | -83.001374 |
| extent x m | 34.6 |
| extent z m | 192.5 |
| path length m | 218.0 |
| unique gps fixes | 37 |
| gps fix ratio | 0.226 |
| step median m | 3.54 |

> GPS updates more slowly than the classifier runs, so only 37 of
> 164 frames carry a distinct coordinate (ratio 0.226).
> Per-metre spatial claims should be read against that figure.

## Vocabulary

| | |
| :--- | ---: |
| labels distinct | 13 |
| type token ratio | 0.079 |
| entropy bits | 2.6 |
| entropy max bits | 3.7 |
| evenness | 0.703 |
| top5 share | 0.878 |
| words per label mean | 4.9 |
| words per label max | 10 |
| multiword share | 0.768 |

Use `evenness` rather than `entropy_bits` to compare sites: raw entropy grows
with the number of distinct labels and so tracks walk length as much as
vocabulary spread.

## Most frequent labels

| # | label | count | share |
| ---: | :--- | ---: | ---: |
| 1 | `streetcar, tram, tramcar, trolley, trolley car` | 70 | 0.427 |
| 2 | `traffic light, traffic signal, stoplight` | 31 | 0.189 |
| 3 | `minivan` | 16 | 0.098 |
| 4 | `limousine, limo` | 15 | 0.091 |
| 5 | `trailer truck, tractor trailer, trucking rig, rig, articulated lorry, semi` | 12 | 0.073 |

## Model behaviour

| | |
| :--- | ---: |
| confidence, median | 0.283 |
| rank1−rank2 margin, median | 0.135 |
| "no idea" rate (top-1 < 0.1) | 0.043 |

**Confidence, median** — the typical score behind the winning label. Scores are
a softmax over 1000 classes, so they run low everywhere; read this as a relative
figure between sites, not as a probability of being right.

**Rank1−rank2 margin, median** — the gap between the best guess and the runner-up
on the same frame. A small margin means two unrelated categories were nearly
tied, so the label that surfaced was close to arbitrary.

**"No idea" rate** — the share of frames whose winning label scored under 0.1.
The threshold is a convention, not a principled cut; the full percentile and
threshold ranges are in `indianola.json` for anything load-bearing.
