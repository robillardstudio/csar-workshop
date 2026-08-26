"""
Clean live-detection CSV:
- Keep only columns: timestamp, lat, lon, label, confidence
- Drop rows where rank is 2 or 3 (keep rank 1 and any rank >= 4)
- Optionally remove rows with duplicate lat/lon/label triplets (keeps first occurrence)
- Optionally convert lat/lon into local metric x/z coordinates
  (flat-earth approximation, origin at the first row's position),
  ready to drop straight into an A-Frame scene (x = east, z = south,
  y-up, right-handed — matches A-Frame's world convention where
  negative z points north/"into the screen").
"""

import csv
import math
import pandas as pd

# Set to True to convert lat/lon -> x/z (meters, origin at first point)
# instead of keeping raw lat/lon columns.
USE_LOCAL_XZ = True

# Set to True to drop rows whose (lat, lon) pair repeats an earlier row.
REMOVE_LATLON_DUPLICATES = True

INPUT_FILE = "live-detection_20260826120120_raw.csv"
OUTPUT_FILE = "csar-oval-park-workshop-metric-noduplicates.csv"

EARTH_RADIUS_M = 6378137.0  # WGS84 equatorial radius


def latlon_to_local_xz(df, lat_col="lat", lon_col="lon", origin=None):
    """
    Convert lat/lon columns to local planar x/z coordinates in meters,
    using an equirectangular (flat-earth) approximation. Good enough for
    short paths (city-block / neighborhood scale); accuracy degrades over
    very large distances or near the poles.

    origin: optional (lat0, lon0) tuple to use as the (0, 0) point.
            Defaults to the first row of df.

    Returns a copy of df with new "x" and "z" columns:
      x = east-west offset from origin (meters, +east)
      z = south-north offset from origin (meters, +south / -north),
          matching A-Frame's default world axes (camera looks down -z).
    """
    df = df.copy()

    if origin is None:
        lat0, lon0 = df.iloc[0][lat_col], df.iloc[0][lon_col]
    else:
        lat0, lon0 = origin

    lat0_rad = math.radians(lat0)
    meters_per_deg_lat = (math.pi / 180.0) * EARTH_RADIUS_M
    meters_per_deg_lon = (math.pi / 180.0) * EARTH_RADIUS_M * math.cos(lat0_rad)

    df["x"] = (df[lon_col] - lon0) * meters_per_deg_lon
    df["z"] = -(df[lat_col] - lat0) * meters_per_deg_lat

    return df


def remove_latlon_duplicates(df, lat_col="lat", lon_col="lon", label_col="label"):
    """
    Drop rows whose (lat, lon) pair has already appeared earlier in df,
    keeping the first occurrence of each unique coordinate.
    """
    before = len(df)
    df = df.drop_duplicates(subset=[lat_col, lon_col, label_col], keep="first")
    print(f"Removed {before - len(df)} duplicate lat/lon rows")
    return df


df = pd.read_csv(INPUT_FILE)

# Remove rows where rank is 2 or 3
df = df[~df["rank"].isin([2, 3])]

if REMOVE_LATLON_DUPLICATES:
    df = remove_latlon_duplicates(df, lat_col="lat", lon_col="lon", label_col="label")

if USE_LOCAL_XZ:
    df = latlon_to_local_xz(df, lat_col="lat", lon_col="lon")
    df = df[["x", "z", "label", "confidence"]]
else:
    df = df[["timestamp", "lat", "lon", "label", "confidence"]]

# Some labels (e.g. "maze, labyrinth") contain a comma, which would normally
# force pandas to quote that field so it isn't mistaken for two columns.
# Since we want NO quotes anywhere in the output, strip commas out of the
# label text itself (comma -> space) so every field is safely unquotable.
if "label" in df.columns:
    df["label"] = df["label"].str.replace(",", "", regex=False)
 
df.to_csv(OUTPUT_FILE, index=False, quoting=csv.QUOTE_NONE)

print(f"Saved {len(df)} rows to {OUTPUT_FILE}")