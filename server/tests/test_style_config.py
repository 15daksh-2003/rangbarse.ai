"""
Unit tests for server/app/style_config.py

Tests style configuration, default fallback, and strength resolution logic.
No GPU dependencies — always runs.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.style_config import (
    StyleConfig,
    STYLE_CONFIGS,
    NEGATIVE_PROMPT,
    LOW_COVERAGE_THRESHOLD,
    LOW_COVERAGE_STRENGTH,
    DEFAULT_STYLE,
    DEFAULT_INFERENCE_STEPS,
    get_style_config,
    get_all_style_names,
    resolve_strength,
)


class TestStyleConfigs:
    """Tests for the STYLE_CONFIGS dictionary."""

    def test_has_three_styles(self):
        assert len(STYLE_CONFIGS) == 3

    def test_required_styles_present(self):
        for name in ["watercolor", "bollywood", "rangoli"]:
            assert name in STYLE_CONFIGS

    def test_each_config_is_style_config(self):
        for name, cfg in STYLE_CONFIGS.items():
            assert isinstance(cfg, StyleConfig), f"{name} is not StyleConfig"

    def test_prompts_are_nonempty_strings(self):
        for name, cfg in STYLE_CONFIGS.items():
            assert isinstance(cfg.prompt, str)
            assert len(cfg.prompt) > 20, f"{name} prompt too short"

    def test_strengths_are_valid(self):
        for name, cfg in STYLE_CONFIGS.items():
            assert 0 < cfg.strength < 1, f"{name} strength out of range"

    def test_guidance_scales_are_valid(self):
        for name, cfg in STYLE_CONFIGS.items():
            assert cfg.guidance_scale > 0, f"{name} guidance_scale invalid"

    def test_negative_prompt_is_nonempty(self):
        assert isinstance(NEGATIVE_PROMPT, str)
        assert len(NEGATIVE_PROMPT) > 10

    def test_negative_prompt_blocks_faces(self):
        assert "face" in NEGATIVE_PROMPT
        assert "person" in NEGATIVE_PROMPT

    def test_default_inference_steps(self):
        assert DEFAULT_INFERENCE_STEPS == 40


class TestGetStyleConfig:
    """Tests for get_style_config()."""

    def test_returns_known_style(self):
        cfg = get_style_config("watercolor")
        assert isinstance(cfg, StyleConfig)
        assert "watercolor" in cfg.prompt.lower()

    def test_returns_each_style(self):
        for name in ["watercolor", "bollywood", "rangoli"]:
            cfg = get_style_config(name)
            assert isinstance(cfg, StyleConfig)

    def test_unknown_style_falls_back_to_default(self):
        cfg = get_style_config("nonexistent")
        assert cfg == STYLE_CONFIGS[DEFAULT_STYLE]

    def test_empty_string_falls_back(self):
        cfg = get_style_config("")
        assert cfg == STYLE_CONFIGS[DEFAULT_STYLE]


class TestGetAllStyleNames:
    """Tests for get_all_style_names()."""

    def test_returns_list(self):
        names = get_all_style_names()
        assert isinstance(names, list)

    def test_contains_all_styles(self):
        names = get_all_style_names()
        assert set(names) == {"watercolor", "bollywood", "rangoli"}


class TestResolveStrength:
    """Tests for resolve_strength()."""

    def test_client_strength_takes_priority(self):
        result = resolve_strength("watercolor", client_strength=0.8, coverage=50)
        assert result == 0.8

    def test_low_coverage_boost(self):
        result = resolve_strength("watercolor", client_strength=0.0, coverage=5)
        assert result == LOW_COVERAGE_STRENGTH

    def test_style_default_when_normal_coverage(self):
        result = resolve_strength("watercolor", client_strength=0.0, coverage=50)
        assert result == STYLE_CONFIGS["watercolor"].strength

    def test_client_zero_means_use_default(self):
        result = resolve_strength("bollywood", client_strength=0.0, coverage=50)
        assert result == STYLE_CONFIGS["bollywood"].strength

    def test_coverage_at_threshold_uses_style_default(self):
        # At exactly the threshold, not below — use style default
        result = resolve_strength("rangoli", client_strength=0.0, coverage=LOW_COVERAGE_THRESHOLD)
        assert result == STYLE_CONFIGS["rangoli"].strength

    def test_coverage_below_threshold_boosts(self):
        result = resolve_strength("rangoli", client_strength=0.0, coverage=LOW_COVERAGE_THRESHOLD - 1)
        assert result == LOW_COVERAGE_STRENGTH

    def test_client_strength_overrides_low_coverage(self):
        result = resolve_strength("watercolor", client_strength=0.3, coverage=1)
        assert result == 0.3
