# The Oval

`oval-park` · 2026-08-26 11:59:09 (UTC-4) · 126.3 s

**Site Name** — The Oval
**City** — Columbus OH
**Setting** — open campus lawn with mature trees and paths
**Weather** — sunny, mild
**Route Note** —  around noon with few people crossing the park

Source: [`live-detection_20260826-120120_raw.csv`](../live-detection_20260826-120120_raw.csv) — 492 rows, 164 frames x 3 ranks.

## Capture

| | |
| :--- | ---: |
| frames | 164 |
| duration s | 126.3 |
| frames per s | 1.3 |
| gps accuracy median m | 15.0 |
| gps accuracy max m | 33.9 |
| inference ms median | 65 |
| frame size | 480x640 |

Model `onnx-community/mobilenetv4_conv_small.e2400_r224_in1k`, fp16 on webgpu.

## Geography

| | |
| :--- | ---: |
| lat median | 39.999561 |
| lon median | -83.011432 |
| lat min | 39.998951 |
| lat max | 39.999819 |
| lon min | -83.011604 |
| lon max | -83.011366 |
| extent x m | 20.3 |
| extent z m | 96.6 |
| path length m | 131.3 |
| unique gps fixes | 43 |
| gps fix ratio | 0.262 |
| step median m | 0.79 |

> GPS updates more slowly than the classifier runs, so only 43 of
> 164 frames carry a distinct coordinate (ratio 0.262).
> Per-metre spatial claims should be read against that figure.

## Model behaviour

| | |
| :--- | ---: |
| confidence mean | 0.204 |
| confidence max | 0.877 |
| confidence p10 | 0.044 |
| confidence p25 | 0.071 |
| confidence p50 | 0.134 |
| confidence p75 | 0.251 |
| confidence p90 | 0.527 |
| margin p25 | 0.016 |
| margin p50 | 0.04 |
| margin p75 | 0.127 |
| below 005 | 0.128 |
| below 010 | 0.378 |
| below 020 | 0.683 |

The margin is the confidence gap between rank 1 and rank 2 on the same frame:
a small value means the top two categories were nearly tied and the label that
surfaced was close to arbitrary. The `below_*` rates are given at three
thresholds because any single threshold is an arbitrary cut — compare the
percentiles instead when comparing sites.

## Vocabulary

| | |
| :--- | ---: |
| labels distinct | 23 |
| type token ratio | 0.14 |
| entropy bits | 3.57 |
| entropy max bits | 4.52 |
| evenness | 0.79 |
| top5 share | 0.683 |
| words per label mean | 2.81 |
| words per label max | 8 |
| multiword share | 0.323 |

### Most frequent labels

| # | label | count | share |
| ---: | :--- | ---: | ---: |
| 1 | `lakeside, lakeshore` | 30 | 0.183 |
| 2 | `mobile home, manufactured home` | 27 | 0.165 |
| 3 | `park bench` | 24 | 0.146 |
| 4 | `worm fence, snake fence, snake-rail fence, Virginia fence` | 16 | 0.098 |
| 5 | `maze, labyrinth` | 15 | 0.091 |

Use `evenness` rather than `entropy_bits` to compare sites: raw entropy grows
with the number of distinct labels and so tracks walk length as much as
vocabulary spread.
