#!/usr/bin/env python3
"""
AI Art Quality Verification — Canvas-Only Pipeline (Legacy Script)

Simulates the full pipeline: ambient map + splatters → server img2img →
client-side overlay with blend modes and lighting.

For the full quality testing framework with automated checks, use:
    python scripts/run_quality_tests.py

This script is retained as a lightweight alternative for quick manual checks.

Usage:
    cd server && source venv/bin/activate
    python scripts/verify_quality.py
"""

import os
import sys
import time
import argparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from PIL import Image

from quality.test_data import create_test_data
from quality.compositor import client_compose
from app.image_utils import resize_for_inference
from app.style_config import get_style_config, get_all_style_names, NEGATIVE_PROMPT, DEFAULT_INFERENCE_STEPS


def main():
    parser = argparse.ArgumentParser(description="Verify AI art quality (canvas-only pipeline)")
    parser.add_argument("--image", type=str, help="Path to custom scene canvas image")
    args = parser.parse_args()

    out_dir = os.path.join(os.path.dirname(__file__), '..', 'test-results')
    os.makedirs(out_dir, exist_ok=True)

    # Create test data
    print("Creating synthetic test data (webcam + splatters + ambient map)...")
    webcam, splat_canvas, scene_canvas = create_test_data()

    webcam.save(os.path.join(out_dir, "webcam.png"))
    splat_canvas.save(os.path.join(out_dir, "splatters.png"))
    scene_canvas.save(os.path.join(out_dir, "scene_canvas.png"))
    print(f"  Webcam: {os.path.join(out_dir, 'webcam.png')}")
    print(f"  Scene canvas (ambient+splatters): {os.path.join(out_dir, 'scene_canvas.png')}")

    # Load model
    print("\nLoading model...")
    from app.model_manager import ModelManager
    model = ModelManager()
    model.load()

    # Use custom image or scene canvas
    if args.image:
        input_img = Image.open(args.image).convert("RGB")
        print(f"Using custom scene canvas: {args.image} ({input_img.size})")
    else:
        input_img = scene_canvas

    input_image = resize_for_inference(input_img)

    print(f"Resized to: {input_image.size}")
    print(f"Scheduler: {model.scheduler_name}")
    print()

    # Generate for each style
    styles = get_all_style_names()
    results = {}

    for style in styles:
        cfg = get_style_config(style)

        print(f"--- {style.upper()} ---")
        print(f"  Prompt: {cfg.prompt[:80]}...")
        print(f"  Strength: {cfg.strength}")
        print(f"  Steps: {DEFAULT_INFERENCE_STEPS}, Guidance: {cfg.guidance_scale}")
        print(f"  Effective steps: {int(DEFAULT_INFERENCE_STEPS * cfg.strength)}")

        t0 = time.time()
        raw = model.generate(
            image=input_image,
            prompt=cfg.prompt,
            negative_prompt=NEGATIVE_PROMPT,
            strength=cfg.strength,
            guidance_scale=cfg.guidance_scale,
            num_inference_steps=DEFAULT_INFERENCE_STEPS,
        )

        # Save raw AI output
        raw_path = os.path.join(out_dir, f"raw_{style}.png")
        raw.save(raw_path)

        # Simulate client-side compositing
        composed = client_compose(webcam, raw, style)
        elapsed = time.time() - t0

        out_path = os.path.join(out_dir, f"output_{style}.png")
        composed.save(out_path)

        results[style] = {"time_s": round(elapsed, 1), "path": out_path}
        print(f"  Time: {elapsed:.1f}s")
        print(f"  Raw AI: {raw_path}")
        print(f"  Final:  {out_path}")
        print()

    # Summary
    print("=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    print(f"Pipeline: Canvas-only with ambient map")
    print(f"Model: SD 1.5 (no LoRA)")
    print(f"Scheduler: {model.scheduler_name}")
    print()
    for style, info in results.items():
        print(f"  {style:12s}  {info['time_s']:5.1f}s  → {info['path']}")

    print()
    print("Files saved:")
    print(f"  webcam.png          — raw webcam (person, preserved)")
    print(f"  splatters.png       — splatter canvas (RGBA)")
    print(f"  scene_canvas.png    — ambient map + splatters (sent to server)")
    print(f"  raw_*.png           — server output (before client compositing)")
    print(f"  output_*.png        — final composed result (webcam + AI art + lighting)")
    print()
    print("Quality checklist:")
    print("  [ ] Scene canvas: person unrecognizable (blurry ambient)")
    print("  [ ] Raw AI: splatters artistically transformed")
    print("  [ ] Final: person clearly visible through overlay")
    print("  [ ] Final: artistic transformation visible on splatters")
    print("  [ ] Final: style-specific lighting applied (warm/vignette/vibrant)")
    print("  [ ] Each style visually distinct")

    all_times = [r["time_s"] for r in results.values()]
    print(f"\n  Timing: min={min(all_times):.1f}s, max={max(all_times):.1f}s, avg={sum(all_times)/len(all_times):.1f}s")
    if max(all_times) <= 15:
        print("  ✓ All within 15s budget")
    else:
        print(f"  ✗ {sum(1 for t in all_times if t > 15)} style(s) exceeded 15s budget")


if __name__ == "__main__":
    main()
