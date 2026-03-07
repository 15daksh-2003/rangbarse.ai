# Quality test runner — orchestrates test data, inference, compositing, and checks.

import os
import time
import logging

from PIL import Image

from quality.test_data import create_test_data
from quality.compositor import client_compose
from quality.checklist import check_image, check_style_differentiation, QualityReport
from quality.config import STYLES
from app.image_utils import resize_for_inference, encode_image_to_png
from app.style_config import get_style_config, NEGATIVE_PROMPT, DEFAULT_INFERENCE_STEPS

logger = logging.getLogger("quality")


class QualityTestRunner:
    """Runs the full quality test pipeline: data → inference → compose → check."""

    def __init__(self, model_manager, out_dir: str):
        self.model = model_manager
        self.out_dir = out_dir

    def run(
        self,
        styles: list[str] | None = None,
        custom_image_path: str | None = None,
        skip_inference: bool = False,
    ) -> QualityReport:
        """Execute quality tests.

        Args:
            styles: list of style names to test (default: all)
            custom_image_path: optional path to a custom scene canvas image
            skip_inference: if True, load existing raw outputs and re-run checks only

        Returns:
            QualityReport with all check results
        """
        os.makedirs(self.out_dir, exist_ok=True)
        styles = styles or STYLES

        # Generate or load test data
        webcam, splat_canvas, scene_canvas = create_test_data()
        webcam.save(os.path.join(self.out_dir, "webcam.png"))
        splat_canvas.save(os.path.join(self.out_dir, "splatters.png"))
        scene_canvas.save(os.path.join(self.out_dir, "scene_canvas.png"))

        if custom_image_path:
            input_img = Image.open(custom_image_path).convert("RGB")
            logger.info(f"Using custom scene canvas: {custom_image_path}")
        else:
            input_img = scene_canvas

        input_resized = resize_for_inference(input_img)

        report = QualityReport()
        raw_images = {}
        composed_images = {}
        timings = {}

        for style in styles:
            if skip_inference:
                raw_path = os.path.join(self.out_dir, f"raw_{style}.png")
                if not os.path.exists(raw_path):
                    logger.warning(f"No existing raw output for {style}, skipping")
                    continue
                raw = Image.open(raw_path).convert("RGB")
            else:
                raw, elapsed = self._run_inference(input_resized, style)
                timings[style] = elapsed
                raw.save(os.path.join(self.out_dir, f"raw_{style}.png"))

            raw_images[style] = raw

            # Compose final output
            composed = client_compose(webcam, raw, style)
            composed.save(os.path.join(self.out_dir, f"output_{style}.png"))
            composed_images[style] = composed

            # Run per-image checks on composed output
            png_bytes = encode_image_to_png(composed)
            img_report = check_image(composed, png_bytes, style)
            report.image_reports.append(img_report)

        # Cross-style differentiation checks
        if len(composed_images) > 1:
            report.cross_checks = check_style_differentiation(composed_images)

        return report

    def _run_inference(self, input_image: Image.Image, style: str):
        """Run model inference for a single style. Returns (output_image, elapsed_seconds)."""
        cfg = get_style_config(style)

        logger.info(f"Generating: style={style}, strength={cfg.strength}, guidance={cfg.guidance_scale}")
        t0 = time.time()

        result = self.model.generate(
            image=input_image,
            prompt=cfg.prompt,
            negative_prompt=NEGATIVE_PROMPT,
            strength=cfg.strength,
            guidance_scale=cfg.guidance_scale,
            num_inference_steps=DEFAULT_INFERENCE_STEPS,
        )

        elapsed = time.time() - t0
        logger.info(f"  {style}: {elapsed:.1f}s")
        return result, elapsed
