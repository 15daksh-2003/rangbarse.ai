"""
Tests for the quality testing framework itself.

Tests test_data generation, compositor, and sanity checks with known inputs.
No GPU dependencies — always runs.
"""
import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from PIL import Image
import numpy as np

from quality.test_data import create_test_data
from quality.compositor import client_compose, apply_lighting, BLEND_CONFIG
from quality.checklist import check_image, check_style_differentiation, _average_hash, _hamming_distance
from quality.config import SCENE_WIDTH, SCENE_HEIGHT, STYLES
from quality.report import generate_report
from quality.checklist import QualityReport, ImageReport, CheckResult
from app.image_utils import encode_image_to_png


class TestCreateTestData:
    """Tests for test_data.create_test_data()."""

    def test_returns_three_images(self):
        webcam, splat, scene = create_test_data()
        assert isinstance(webcam, Image.Image)
        assert isinstance(splat, Image.Image)
        assert isinstance(scene, Image.Image)

    def test_webcam_dimensions(self):
        webcam, _, _ = create_test_data()
        assert webcam.size == (SCENE_WIDTH, SCENE_HEIGHT)

    def test_webcam_is_rgb(self):
        webcam, _, _ = create_test_data()
        assert webcam.mode == "RGB"

    def test_splatter_is_rgba(self):
        _, splat, _ = create_test_data()
        assert splat.mode == "RGBA"
        assert splat.size == (SCENE_WIDTH, SCENE_HEIGHT)

    def test_scene_is_rgb(self):
        _, _, scene = create_test_data()
        assert scene.mode == "RGB"
        assert scene.size == (SCENE_WIDTH, SCENE_HEIGHT)

    def test_deterministic_with_same_seed(self):
        w1, _, _ = create_test_data(seed=42)
        w2, _, _ = create_test_data(seed=42)
        assert np.array_equal(np.array(w1), np.array(w2))

    def test_different_with_different_seed(self):
        w1, _, _ = create_test_data(seed=42)
        w2, _, _ = create_test_data(seed=99)
        assert not np.array_equal(np.array(w1), np.array(w2))


class TestClientCompose:
    """Tests for compositor.client_compose()."""

    def test_compose_returns_image(self):
        webcam = Image.new("RGB", (100, 100), (200, 180, 160))
        transformed = Image.new("RGB", (100, 100), (50, 100, 200))
        result = client_compose(webcam, transformed, "watercolor")
        assert isinstance(result, Image.Image)
        assert result.mode == "RGB"

    def test_compose_preserves_dimensions(self):
        webcam = Image.new("RGB", (200, 150))
        transformed = Image.new("RGB", (200, 150))
        result = client_compose(webcam, transformed, "bollywood")
        assert result.size == (200, 150)

    def test_compose_resizes_transformed_if_needed(self):
        webcam = Image.new("RGB", (200, 150))
        transformed = Image.new("RGB", (100, 75))
        result = client_compose(webcam, transformed, "rangoli")
        assert result.size == (200, 150)

    def test_unknown_style_uses_watercolor(self):
        webcam = Image.new("RGB", (50, 50), (200, 200, 200))
        transformed = Image.new("RGB", (50, 50), (100, 100, 100))
        result = client_compose(webcam, transformed, "nonexistent")
        assert result.size == (50, 50)

    def test_all_styles_produce_different_results(self):
        webcam = Image.new("RGB", (50, 50), (200, 180, 160))
        transformed = Image.new("RGB", (50, 50), (50, 100, 200))
        results = {}
        for style in ["watercolor", "bollywood", "rangoli"]:
            results[style] = np.array(client_compose(webcam, transformed, style))
        # At least some pairs should differ
        assert not np.array_equal(results["watercolor"], results["bollywood"])


class TestApplyLighting:
    """Tests for compositor.apply_lighting()."""

    def test_returns_rgb_image(self):
        img = Image.new("RGB", (100, 100), (128, 128, 128))
        for style in ["watercolor", "bollywood", "rangoli"]:
            result = apply_lighting(img, style)
            assert result.mode == "RGB"
            assert result.size == (100, 100)

    def test_unknown_style_returns_unchanged_dimensions(self):
        img = Image.new("RGB", (50, 50))
        result = apply_lighting(img, "unknown")
        assert result.size == (50, 50)


class TestBlendConfig:
    """Tests for BLEND_CONFIG consistency."""

    def test_all_styles_have_blend_config(self):
        for style in STYLES:
            assert style in BLEND_CONFIG

    def test_blend_config_has_mode_and_opacity(self):
        for style, cfg in BLEND_CONFIG.items():
            assert "mode" in cfg
            assert "opacity" in cfg
            assert 0 < cfg["opacity"] <= 1


class TestCheckImage:
    """Tests for checklist.check_image()."""

    def test_normal_image_passes(self):
        # Create a colorful image with noise (resembles real AI output)
        rng = np.random.RandomState(42)
        pixels = rng.randint(30, 220, (512, 512, 3), dtype=np.uint8)
        img = Image.fromarray(pixels)

        png_bytes = encode_image_to_png(img)
        report = check_image(img, png_bytes, "watercolor")
        assert report.all_passed

    def test_blank_image_fails(self):
        img = Image.new("RGB", (512, 512), (0, 0, 0))
        png_bytes = encode_image_to_png(img)
        report = check_image(img, png_bytes, "watercolor")
        assert not report.all_passed

    def test_white_image_fails(self):
        img = Image.new("RGB", (512, 512), (255, 255, 255))
        png_bytes = encode_image_to_png(img)
        report = check_image(img, png_bytes, "watercolor")
        # Should fail color diversity (all channels same)
        assert not report.all_passed

    def test_monochrome_fails_diversity(self):
        img = Image.new("RGB", (100, 100), (128, 128, 128))
        png_bytes = encode_image_to_png(img)
        report = check_image(img, png_bytes, "watercolor")
        # Uniform color → std = 0 → fails
        assert not report.all_passed


class TestStyleDifferentiation:
    """Tests for checklist.check_style_differentiation()."""

    def test_identical_images_fail(self):
        img = Image.new("RGB", (100, 100), (128, 64, 32))
        results = check_style_differentiation({"a": img, "b": img})
        # Identical images should have distance 0 → fail
        assert any(not r.passed for r in results)

    def test_very_different_images_pass(self):
        # Create images with complex patterns (not solid colors)
        pixels_a = np.zeros((100, 100, 3), dtype=np.uint8)
        pixels_a[:50, :, 0] = 255  # red top half
        pixels_a[50:, :, 1] = 255  # green bottom half
        img_a = Image.fromarray(pixels_a)

        pixels_b = np.zeros((100, 100, 3), dtype=np.uint8)
        pixels_b[:, :50, 2] = 255  # blue left half
        pixels_b[:, 50:, :] = 255  # white right half
        img_b = Image.fromarray(pixels_b)

        results = check_style_differentiation({"a": img_a, "b": img_b})
        assert all(r.passed for r in results)


class TestHashFunctions:
    """Tests for hash utility functions."""

    def test_same_image_same_hash(self):
        img = Image.new("RGB", (100, 100), (50, 100, 150))
        assert _average_hash(img) == _average_hash(img)

    def test_hamming_distance_identical(self):
        assert _hamming_distance(0, 0) == 0

    def test_hamming_distance_different(self):
        assert _hamming_distance(0b1111, 0b0000) == 4


class TestGenerateReport:
    """Tests for report.generate_report()."""

    def test_generates_markdown(self):
        report = QualityReport(
            image_reports=[
                ImageReport(style="watercolor", checks=[
                    CheckResult(name="not_blank", passed=True, detail="ok"),
                ]),
            ],
            cross_checks=[],
        )
        md = generate_report(report, "/tmp/test")
        assert "# Quality Test Report" in md
        assert "watercolor" in md.lower()
        assert "PASS" in md

    def test_report_includes_manual_checklist(self):
        report = QualityReport(image_reports=[], cross_checks=[])
        md = generate_report(report, "/tmp/test")
        assert "Manual Visual Inspection" in md
        assert "person clearly visible" in md
