"""
Smooth the lat/lon of a raw live-detection CSV.

Why this is needed: phone GPS accuracy on these walks is ~10-19 m, and the
browser only delivers a new fix every ~3 s while detections arrive every
~0.8 s. So the raw log holds each fix several times over (a staircase), and
the path jumps in steps with noisy corners, which shows up as glitching in
the visualisation.

Method (offline, so it can look at the whole walk):
1. Project lat/lon to local metric east/north (flat-earth, origin at the
   first fix), same approximation as clean.py.
2. Collapse the repeated rows back to the real GPS fixes (unique gps_timestamp).
   Each fix is a measurement with its own variance taken from gps_accuracy.
3. Run a constant-velocity Kalman filter over a timeline of every fix time
   and every detection frame time. Walking at steady speed means a low
   process noise, so the path is strongly regularised.
4. Run a Rauch-Tung-Striebel (RTS) backward pass so each frame uses fixes
   from both before and after it (no lag, no end-of-walk drift).
5. Optionally (EQUALISE_SPACING) re-time the smoothed path to constant speed,
   spreading the frames at equal arc-length steps. Justified because the walk
   speed and frame rate were both near constant (frame index, not time, is used
   so recording pauses do not distort it), and it gives labels an
   even spacing.

Frames sharing a timestamp (rank 1/2/3 of one frame) always get the same
position. Writes <input>_smooth.csv with lat/lon replaced and the originals
kept as lat_raw/lon_raw.

Usage:
    python smoother.py live-detection_20260826-120120_raw.csv
    python smoother.py raw.csv -o out.csv --drop-ranks --accel 0.05
"""

import argparse
import math
import os

import numpy as np
import pandas as pd

# Set to True to drop rows with rank 2 or 3 (keeps rank 1 and any rank >= 4).
# Same rule as clean.py. Can be switched on from the command line with --drop-ranks.
DROP_RANKS_2_3 = False

# Set to True to redistribute frames at equal arc-length steps (constant speed).
EQUALISE_SPACING = True

# Process noise: assumed std-dev of walking acceleration changes (m/s^2).
# Lower = straighter, smoother path; higher = follows the GPS more closely.
ACCEL_SIGMA = 0.15

# Multiplier on gps_accuracy to get the measurement std-dev. gps_accuracy is a
# ~68% radius, so 1.0 is right in principle; raise it to distrust GPS more.
ACCURACY_SCALE = 1.0

EARTH_RADIUS_M = 6378137.0  # WGS84 equatorial radius (same as clean.py)


# ---------- projection ----------

def to_local_en(lat, lon, lat0, lon0):
    m_lat = math.pi / 180.0 * EARTH_RADIUS_M
    m_lon = m_lat * math.cos(math.radians(lat0))
    return (lon - lon0) * m_lon, (lat - lat0) * m_lat  # east, north


def from_local_en(e, n, lat0, lon0):
    m_lat = math.pi / 180.0 * EARTH_RADIUS_M
    m_lon = m_lat * math.cos(math.radians(lat0))
    return lat0 + n / m_lat, lon0 + e / m_lon


# ---------- Kalman + RTS ----------

def kalman_rts(times, meas, accel_sigma):
    """
    times: (T,) seconds, sorted. meas: list of None or (e, n, sigma) per step.
    State [e, n, ve, vn]. Returns smoothed states (T, 4).
    """
    T = len(times)
    H = np.array([[1.0, 0, 0, 0], [0, 1.0, 0, 0]])
    x_f = np.zeros((T, 4))
    P_f = np.zeros((T, 4, 4))
    x_p = np.zeros((T, 4))
    P_p = np.zeros((T, 4, 4))
    F_all = np.zeros((T, 4, 4))

    first = next(m for m in meas if m is not None)
    x = np.array([first[0], first[1], 0.0, 0.0])
    P = np.diag([first[2] ** 2, first[2] ** 2, 2.0 ** 2, 2.0 ** 2])  # speed < ~2 m/s prior

    for k in range(T):
        if k == 0:
            F = np.eye(4)
            Q = np.zeros((4, 4))
        else:
            dt = times[k] - times[k - 1]
            F = np.eye(4)
            F[0, 2] = F[1, 3] = dt
            q = accel_sigma ** 2
            Q = np.zeros((4, 4))
            for i in (0, 1):  # white-noise acceleration, each axis
                Q[i, i] = q * dt ** 3 / 3
                Q[i, i + 2] = Q[i + 2, i] = q * dt ** 2 / 2
                Q[i + 2, i + 2] = q * dt
            x = F @ x
            P = F @ P @ F.T + Q
        F_all[k] = F
        x_p[k], P_p[k] = x, P

        if meas[k] is not None:
            e, n, s = meas[k]
            R = np.eye(2) * s ** 2
            S = H @ P @ H.T + R
            K = P @ H.T @ np.linalg.inv(S)
            x = x + K @ (np.array([e, n]) - H @ x)
            P = (np.eye(4) - K @ H) @ P
        x_f[k], P_f[k] = x, P

    x_s = x_f.copy()
    for k in range(T - 2, -1, -1):
        C = P_f[k] @ F_all[k + 1].T @ np.linalg.inv(P_p[k + 1])
        x_s[k] = x_f[k] + C @ (x_s[k + 1] - x_p[k + 1])
    return x_s


# ---------- spacing ----------

def equalise_spacing(e, n):
    """
    Re-place points along their own polyline so arc length grows linearly with
    frame index. Index is used rather than time because the frame rate is steady
    but recordings can contain pauses (gaps of several seconds) that would
    otherwise distort the spacing.
    """
    seg = np.hypot(np.diff(e), np.diff(n))
    s = np.concatenate([[0.0], np.cumsum(seg)])
    if s[-1] == 0:
        return e, n
    s_target = np.linspace(0.0, s[-1], len(s))
    return np.interp(s_target, s, e), np.interp(s_target, s, n)


# ---------- main ----------

def smooth_file(df, drop_ranks, equalise, accel_sigma, accuracy_scale):
    df = df.copy()
    if drop_ranks:
        df = df[~df["rank"].isin([2, 3])].copy()

    # One row per detection frame, one row per distinct GPS fix.
    frames = df.drop_duplicates("timestamp")[["timestamp", "lat", "lon"]].sort_values("timestamp")
    fixes = (df.drop_duplicates("gps_timestamp")
               [["gps_timestamp", "lat", "lon", "gps_accuracy"]]
               .sort_values("gps_timestamp"))

    lat0, lon0 = fixes.iloc[0]["lat"], fixes.iloc[0]["lon"]
    fe, fn = to_local_en(fixes["lat"].to_numpy(), fixes["lon"].to_numpy(), lat0, lon0)

    # Timeline: every fix time and every frame time (seconds).
    ft = fixes["gps_timestamp"].to_numpy() / 1000.0
    tt = frames["timestamp"].to_numpy() / 1000.0
    all_t = np.unique(np.concatenate([ft, tt]))
    idx = {t: i for i, t in enumerate(all_t)}
    meas = [None] * len(all_t)
    for t, e, n, acc in zip(ft, fe, fn, fixes["gps_accuracy"].to_numpy()):
        meas[idx[t]] = (e, n, max(acc * accuracy_scale, 1.0))

    states = kalman_rts(all_t, meas, accel_sigma)
    fi = np.array([idx[t] for t in tt])
    e, n = states[fi, 0], states[fi, 1]
    if equalise:
        e, n = equalise_spacing(e, n)

    lat, lon = from_local_en(e, n, lat0, lon0)
    smooth = pd.DataFrame({"timestamp": frames["timestamp"].to_numpy(),
                           "lat_s": lat, "lon_s": lon})

    out = df.merge(smooth, on="timestamp", how="left")
    out["lat_raw"], out["lon_raw"] = out["lat"], out["lon"]
    out["lat"], out["lon"] = out["lat_s"], out["lon_s"]
    out = out.drop(columns=["lat_s", "lon_s"])

    # Report how much more regular the spacing got.
    re, rn = to_local_en(frames["lat"].to_numpy(), frames["lon"].to_numpy(), lat0, lon0)
    stats = {}
    for name, (a, b) in {"raw": (re, rn), "smooth": (e, n)}.items():
        step = np.hypot(np.diff(a), np.diff(b))
        stats[name] = (step.sum(), step.mean(), step.std() / step.mean() if step.mean() else float("nan"))
    return out, stats, len(frames), len(fixes)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", help="raw live-detection CSV")
    ap.add_argument("-o", "--output", help="output CSV (default: <input>_smooth.csv)")
    ap.add_argument("--drop-ranks", action="store_true", default=DROP_RANKS_2_3,
                    help="drop rows where rank is 2 or 3 (keep rank 1)")
    ap.add_argument("--no-equalise", action="store_true", help="skip constant-speed re-spacing")
    ap.add_argument("--accel", type=float, default=ACCEL_SIGMA,
                    help="process noise, acceleration std-dev in m/s^2 (default %(default)s)")
    ap.add_argument("--accuracy-scale", type=float, default=ACCURACY_SCALE,
                    help="multiplier on gps_accuracy (default %(default)s)")
    args = ap.parse_args()

    df = pd.read_csv(args.input)
    out, stats, n_frames, n_fixes = smooth_file(
        df, args.drop_ranks, EQUALISE_SPACING and not args.no_equalise, args.accel, args.accuracy_scale)

    output = args.output or os.path.splitext(args.input)[0] + "_smooth.csv"
    out.to_csv(output, index=False)

    print(f"{n_frames} frames from {n_fixes} distinct GPS fixes -> {len(out)} rows written to {output}")
    for name, (length, mean, cv) in stats.items():
        print(f"  {name:6s} path {length:6.1f} m, mean step {mean:.2f} m, step variation (CV) {cv:.2f}")


if __name__ == "__main__":
    main()
