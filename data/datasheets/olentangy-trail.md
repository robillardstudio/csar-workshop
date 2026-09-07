# Olentangy Trail

`olentangy-trail` · 2026-09-04 19:57:38 (UTC-4) · 556.9 s

**Site Name** — Olentangy Trail
**City** — Columbus OH
**Setting** — bike trail shared by bikes, pedestrians and runners
**Weather** — sunny, mild
**Route Note** — low light conditions right after sunset, muddy bike trail resulting from recent flood, few people

Source: [`live-detection_20260904-200659_raw.csv`](../live-detection_20260904-200659_raw.csv) — 2079 rows, 693 frames x 3 ranks.

## Capture

| | |
| :--- | ---: |
| frames | 693 |
| duration s | 556.9 |
| frames per s | 1.24 |
| gps accuracy median m | 22.9 |
| gps accuracy max m | 60.7 |
| inference ms median | 66 |
| frame size | 480x640 |

Model `onnx-community/mobilenetv4_conv_small.e2400_r224_in1k`, fp16 on webgpu.

## Geography

| | |
| :--- | ---: |
| lat median | 40.024981 |
| lon median | -83.021387 |
| lat min | 40.022132 |
| lat max | 40.027025 |
| lon min | -83.024172 |
| lon max | -83.01989 |
| extent x m | 365.0 |
| extent z m | 544.7 |
| path length m | 1270.9 |
| unique gps fixes | 181 |
| gps fix ratio | 0.261 |
| step median m | 3.54 |

> GPS updates more slowly than the classifier runs, so only 181 of
> 693 frames carry a distinct coordinate (ratio 0.261).
> Per-metre spatial claims should be read against that figure.

## Vocabulary

| | |
| :--- | ---: |
| labels distinct | 25 |
| type token ratio | 0.036 |
| entropy bits | 2.83 |
| entropy max bits | 4.64 |
| evenness | 0.609 |
| top5 share | 0.833 |
| words per label mean | 2.69 |
| words per label max | 8 |
| multiword share | 0.229 |

Use `evenness` rather than `entropy_bits` to compare sites: raw entropy grows
with the number of distinct labels and so tracks walk length as much as
vocabulary spread.

## Most frequent labels

| # | label | count | share |
| ---: | :--- | ---: | ---: |
| 1 | `park bench` | 323 | 0.466 |
| 2 | `lakeside, lakeshore` | 85 | 0.123 |
| 3 | `oxcart` | 75 | 0.108 |
| 4 | `worm fence, snake fence, snake-rail fence, Virginia fence` | 64 | 0.092 |
| 5 | `sandbar, sand bar` | 30 | 0.043 |

## Model behaviour

| | |
| :--- | ---: |
| confidence, median | 0.121 |
| rank1−rank2 margin, median | 0.048 |
| "no idea" rate (top-1 < 0.1) | 0.397 |

**Confidence, median** — the typical score behind the winning label. Scores are
a softmax over 1000 classes, so they run low everywhere; read this as a relative
figure between sites, not as a probability of being right.

**Rank1−rank2 margin, median** — the gap between the best guess and the runner-up
on the same frame. A small margin means two unrelated categories were nearly
tied, so the label that surfaced was close to arbitrary.

**"No idea" rate** — the share of frames whose winning label scored under 0.1.
The threshold is a convention, not a principled cut; the full percentile and
threshold ranges are in `olentangy-trail.json` for anything load-bearing.
