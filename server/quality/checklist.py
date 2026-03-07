# Automated sanity checks for AI art generation quality.
# Two tiers: per-image checks and cross-style checks.

from dataclasses import dataclass, field

import numpy as np
from PIL import Image

from quality.config import (
    MEAN_PIXEL_MIN,
    MEAN_PIXEL_MAX,
    COLOR_DIVERSITY_MIN_STD,
    FILE_SIZE_MIN_BYTES,
    FILE_SIZE_MAX_BYTES,
    STYLE_DIFFERENTIATION_MIN_DISTANCE,
)


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str


@dataclass
class ImageReport:
    style: str
    checks: list[CheckResult] = field(default_factory=list)

    @property
    def all_passed(self) -> bool:
        return all(c.passed for c in self.checks)


@dataclass
class QualityReport:
    image_reports: list[ImageReport] = field(default_factory=list)
    cross_checks: list[CheckResult] = field(default_factory=list)

    @property
    def all_passed(self) -> bool:
        return (
            all(r.all_passed for r in self.image_reports)
            and all(c.passed for c in self.cross_checks)
        )


def check_image(image: Image.Image, png_bytes: bytes, style: str) -> ImageReport:
    """Run all per-image sanity checks.

    Args:
        image: PIL Image (RGB) — the image to check
        png_bytes: raw PNG bytes of the image
        style: style name for reporting

    Returns:
        ImageReport with individual check results
    """
    report = ImageReport(style=style)

    pixels = np.array(image).astype(np.float32)
    mean_val = pixels.mean()
    report.checks.append(CheckResult(
        name="not_blank",
        passed=MEAN_PIXEL_MIN < mean_val < MEAN_PIXEL_MAX,
        detail=f"mean pixel={mean_val:.1f} (valid: {MEAN_PIXEL_MIN}-{MEAN_PIXEL_MAX})",
    ))

    w, h = image.size
    report.checks.append(CheckResult(
        name="valid_dimensions",
        passed=w > 0 and h > 0,
        detail=f"dimensions={w}x{h}",
    ))

    # Color diversity: check std dev across each channel
    channel_stds = [pixels[:, :, c].std() for c in range(3)]
    min_std = min(channel_stds)
    report.checks.append(CheckResult(
        name="color_diversity",
        passed=min_std > COLOR_DIVERSITY_MIN_STD,
        detail=f"channel stds={[f'{s:.1f}' for s in channel_stds]} (min required: {COLOR_DIVERSITY_MIN_STD})",
    ))

    # File size
    size = len(png_bytes)
    report.checks.append(CheckResult(
        name="file_size",
        passed=FILE_SIZE_MIN_BYTES <= size <= FILE_SIZE_MAX_BYTES,
        detail=f"size={size} bytes (valid: {FILE_SIZE_MIN_BYTES}-{FILE_SIZE_MAX_BYTES})",
    ))

    return report


def check_style_differentiation(images: dict[str, Image.Image]) -> list[CheckResult]:
    """Check that different styles produce visually distinct outputs.

    Uses average hash (aHash) for perceptual comparison.
    """
    results = []
    hashes = {}

    for style, img in images.items():
        hashes[style] = _average_hash(img)

    styles = list(hashes.keys())
    for i in range(len(styles)):
        for j in range(i + 1, len(styles)):
            s1, s2 = styles[i], styles[j]
            distance = _hamming_distance(hashes[s1], hashes[s2])
            results.append(CheckResult(
                name=f"style_diff_{s1}_vs_{s2}",
                passed=distance >= STYLE_DIFFERENTIATION_MIN_DISTANCE,
                detail=f"hash distance={distance} (min required: {STYLE_DIFFERENTIATION_MIN_DISTANCE})",
            ))

    return results


def _average_hash(image: Image.Image, hash_size: int = 8) -> int:
    """Compute average hash (aHash) of an image."""
    small = image.resize((hash_size, hash_size), Image.LANCZOS).convert("L")
    pixels = np.array(small)
    avg = pixels.mean()
    bits = (pixels > avg).flatten()
    hash_val = 0
    for bit in bits:
        hash_val = (hash_val << 1) | int(bit)
    return hash_val


def _hamming_distance(a: int, b: int) -> int:
    """Hamming distance between two integers."""
    return bin(a ^ b).count('1')
