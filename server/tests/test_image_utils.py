"""
Unit tests for server/app/image_utils.py

Tests base64 decoding, image resizing, and PNG encoding.
No GPU dependencies — always runs.
"""
import io
import base64
import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from PIL import Image
from app.image_utils import decode_base64_image, resize_for_inference, encode_image_to_png


def _make_test_png(width=100, height=100, color=(128, 64, 32)):
    """Create a test PNG and return base64 string."""
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


class TestDecodeBase64Image:
    """Tests for decode_base64_image()."""

    def test_decodes_raw_base64(self):
        b64 = _make_test_png(50, 50)
        img = decode_base64_image(b64)
        assert img.size == (50, 50)
        assert img.mode == "RGB"

    def test_decodes_data_url(self):
        b64 = _make_test_png(80, 60)
        data_url = f"data:image/png;base64,{b64}"
        img = decode_base64_image(data_url)
        assert img.size == (80, 60)

    def test_converts_to_rgb(self):
        # Create RGBA image
        img = Image.new("RGBA", (10, 10), (255, 0, 0, 128))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")

        result = decode_base64_image(b64)
        assert result.mode == "RGB"

    def test_invalid_base64_raises(self):
        with pytest.raises(Exception):
            decode_base64_image("not-valid-base64!!!")


class TestResizeForInference:
    """Tests for resize_for_inference()."""

    def test_large_image_scales_down(self):
        img = Image.new("RGB", (1280, 720))
        result = resize_for_inference(img, max_dim=512)
        assert max(result.size) <= 512

    def test_dimensions_are_multiples_of_8(self):
        img = Image.new("RGB", (1000, 777))
        result = resize_for_inference(img)
        w, h = result.size
        assert w % 8 == 0
        assert h % 8 == 0

    def test_preserves_aspect_ratio(self):
        img = Image.new("RGB", (1600, 800))
        result = resize_for_inference(img, max_dim=512)
        w, h = result.size
        # Aspect ratio ~2:1, so width should be ~2x height
        assert abs(w / h - 2.0) < 0.2

    def test_small_image_stays_small(self):
        img = Image.new("RGB", (64, 64))
        result = resize_for_inference(img, max_dim=512)
        # Should scale up since max_dim > size, but result stays proportional
        assert max(result.size) <= 512

    def test_minimum_dimension_is_8(self):
        img = Image.new("RGB", (1, 1))
        result = resize_for_inference(img)
        w, h = result.size
        assert w >= 8
        assert h >= 8

    def test_custom_max_dim(self):
        img = Image.new("RGB", (1024, 1024))
        result = resize_for_inference(img, max_dim=256)
        assert max(result.size) <= 256


class TestEncodeImageToPng:
    """Tests for encode_image_to_png()."""

    def test_returns_bytes(self):
        img = Image.new("RGB", (10, 10), (255, 0, 0))
        result = encode_image_to_png(img)
        assert isinstance(result, bytes)

    def test_valid_png_header(self):
        img = Image.new("RGB", (10, 10))
        result = encode_image_to_png(img)
        # PNG magic bytes
        assert result[:4] == b'\x89PNG'

    def test_roundtrip(self):
        img = Image.new("RGB", (50, 50), (100, 200, 50))
        png_bytes = encode_image_to_png(img)
        decoded = Image.open(io.BytesIO(png_bytes))
        assert decoded.size == (50, 50)
