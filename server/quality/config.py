# Quality framework configuration.
# Defines thresholds, expected dimensions, and styles for quality testing.

from app.style_config import get_all_style_names

# Image dimensions
SCENE_WIDTH = 1280
SCENE_HEIGHT = 720

# Styles to test (derived from style_config source of truth)
STYLES = get_all_style_names()

# --- Automated sanity check thresholds ---

# Mean pixel value: image should not be near-blank or near-white
MEAN_PIXEL_MIN = 10
MEAN_PIXEL_MAX = 245

# Color diversity: std dev across channels should be above this
COLOR_DIVERSITY_MIN_STD = 10.0

# File size bounds (PNG bytes) for a 512-ish output
FILE_SIZE_MIN_BYTES = 5_000
FILE_SIZE_MAX_BYTES = 5_000_000

# Perceptual hash distance: different styles should differ by at least this
# (hamming distance on 64-bit hash; max = 64)
STYLE_DIFFERENTIATION_MIN_DISTANCE = 4
