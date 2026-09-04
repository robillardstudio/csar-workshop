# Indianola Avenue

`indianola` · 2026-08-28 08:29:29 (UTC-4) · 127.2 s

**Site Name** — Indianola Avenue
**City** — Columbus OH
**Setting** — residential street with parked cars and street furniture

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

## Model behaviour

| | |
| :--- | ---: |
| confidence mean | 0.311 |
| confidence max | 0.831 |
| confidence p10 | 0.125 |
| confidence p25 | 0.189 |
| confidence p50 | 0.283 |
| confidence p75 | 0.4 |
| confidence p90 | 0.517 |
| margin p25 | 0.052 |
| margin p50 | 0.135 |
| margin p75 | 0.293 |
| below 005 | 0.0 |
| below 010 | 0.043 |
| below 020 | 0.274 |

The margin is the confidence gap between rank 1 and rank 2 on the same frame:
a small value means the top two categories were nearly tied and the label that
surfaced was close to arbitrary. The `below_*` rates are given at three
thresholds because any single threshold is an arbitrary cut — compare the
percentiles instead when comparing sites.

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

### Most frequent labels

| # | label | count | share |
| ---: | :--- | ---: | ---: |
| 1 | `streetcar, tram, tramcar, trolley, trolley car` | 70 | 0.427 |
| 2 | `traffic light, traffic signal, stoplight` | 31 | 0.189 |
| 3 | `minivan` | 16 | 0.098 |
| 4 | `limousine, limo` | 15 | 0.091 |
| 5 | `trailer truck, tractor trailer, trucking rig, rig, articulated lorry, semi` | 12 | 0.073 |

Use `evenness` rather than `entropy_bits` to compare sites: raw entropy grows
with the number of distinct labels and so tracks walk length as much as
vocabulary spread.
