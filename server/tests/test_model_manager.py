"""
Unit tests for server/app/model_manager.py

Tests ModelManager interface with mocked pipeline.
No GPU dependencies — always runs.
"""
import sys
import os
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.model_manager import ModelManager


class TestModelManagerInit:
    """Tests for ModelManager initialization."""

    def test_not_loaded_initially(self):
        mm = ModelManager()
        assert mm.is_loaded is False

    def test_pipe_is_none_initially(self):
        mm = ModelManager()
        assert mm.pipe is None

    def test_scheduler_name_when_not_loaded(self):
        mm = ModelManager()
        assert mm.scheduler_name == "none"


class TestModelManagerDeviceInfo:
    """Tests for device_info()."""

    def test_device_info_without_gpu(self):
        mm = ModelManager()
        info = mm.device_info()
        # Without GPU deps or CUDA, should return defaults
        assert "gpu" in info
        assert "vram_allocated" in info


class TestModelManagerGenerate:
    """Tests for generate() with mocked pipeline."""

    def test_generate_calls_pipe(self):
        mm = ModelManager()

        mock_image = MagicMock()
        mock_result = MagicMock()
        mock_result.images = [mock_image]

        mm.pipe = MagicMock(return_value=mock_result)

        from PIL import Image
        test_input = Image.new("RGB", (512, 512))

        result = mm.generate(
            image=test_input,
            prompt="test prompt",
            negative_prompt="ugly",
            strength=0.5,
            guidance_scale=7.0,
            num_inference_steps=20,
        )

        assert result == mock_image
        mm.pipe.assert_called_once_with(
            prompt="test prompt",
            negative_prompt="ugly",
            image=test_input,
            num_inference_steps=20,
            strength=0.5,
            guidance_scale=7.0,
        )

    def test_generate_uses_default_steps(self):
        mm = ModelManager()
        mock_result = MagicMock()
        mock_result.images = [MagicMock()]
        mm.pipe = MagicMock(return_value=mock_result)

        from PIL import Image
        test_input = Image.new("RGB", (512, 512))

        mm.generate(
            image=test_input,
            prompt="test",
            negative_prompt="",
            strength=0.5,
            guidance_scale=7.0,
        )

        call_kwargs = mm.pipe.call_args[1]
        assert call_kwargs["num_inference_steps"] == 40

    def test_is_loaded_after_pipe_set(self):
        mm = ModelManager()
        mm.pipe = MagicMock()
        assert mm.is_loaded is True

    def test_scheduler_name_with_pipe(self):
        mm = ModelManager()
        mm.pipe = MagicMock()
        mm.pipe.scheduler.__class__.__name__ = "DPMSolverMultistepScheduler"
        assert mm.scheduler_name == "DPMSolverMultistepScheduler"
