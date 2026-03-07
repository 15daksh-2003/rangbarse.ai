# Synthetic test data generation for quality testing.
# Produces a synthetic webcam frame, splatter canvas, and scene canvas
# that simulate the browser pipeline without requiring a real camera.

import random

from PIL import Image, ImageDraw, ImageFilter

from quality.config import SCENE_WIDTH, SCENE_HEIGHT


def create_test_data(seed: int = 42):
    """Create synthetic webcam frame, splatter canvas, and scene canvas.

    Returns:
        tuple: (webcam_frame: RGB Image, splat_canvas: RGBA Image, scene_canvas: RGB Image)
    """
    random.seed(seed)
    W, H = SCENE_WIDTH, SCENE_HEIGHT

    webcam = _create_webcam_frame(W, H)
    splat_canvas = _create_splatter_canvas(W, H)
    scene_canvas = _compose_scene(webcam, splat_canvas)

    return webcam, splat_canvas, scene_canvas


def _create_webcam_frame(w, h):
    """Synthetic room-like background with person silhouette."""
    webcam = Image.new("RGB", (w, h), (200, 195, 185))
    draw = ImageDraw.Draw(webcam)

    # Wall texture
    for _ in range(500):
        x, y = random.randint(0, w - 1), random.randint(0, h - 1)
        shade = random.randint(185, 215)
        draw.rectangle(
            [x, y, x + random.randint(3, 15), y + random.randint(3, 15)],
            fill=(shade, shade - 5, shade - 10),
        )

    # Person (head, body, arms, legs)
    draw.ellipse([570, 100, 710, 260], fill=(210, 170, 130))   # head
    draw.ellipse([575, 90, 705, 190], fill=(40, 30, 25))       # hair
    draw.ellipse([605, 170, 625, 185], fill=(255, 255, 255))   # eye L
    draw.ellipse([610, 173, 620, 183], fill=(50, 30, 20))
    draw.ellipse([655, 170, 675, 185], fill=(255, 255, 255))   # eye R
    draw.ellipse([660, 173, 670, 183], fill=(50, 30, 20))
    draw.line([(640, 190), (635, 215)], fill=(180, 140, 110), width=2)
    draw.arc([620, 220, 660, 240], 0, 180, fill=(180, 100, 100), width=2)
    draw.rectangle([580, 260, 700, 520], fill=(40, 40, 50))    # body
    draw.rectangle([500, 270, 580, 420], fill=(40, 40, 50))    # left arm
    draw.rectangle([700, 270, 780, 420], fill=(40, 40, 50))    # right arm
    draw.ellipse([490, 230, 550, 290], fill=(210, 170, 130))   # left hand
    draw.ellipse([730, 230, 790, 290], fill=(210, 170, 130))   # right hand
    draw.rectangle([590, 520, 640, 700], fill=(60, 60, 80))    # left leg
    draw.rectangle([650, 520, 700, 700], fill=(60, 60, 80))    # right leg

    return webcam


def _create_splatter_canvas(w, h):
    """RGBA canvas with semi-transparent Holi splatters."""
    splat_canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(splat_canvas)

    splatter_colors = [
        (255, 20, 147, 153),   # pink
        (255, 165, 0, 140),    # orange
        (0, 200, 255, 130),    # cyan
        (255, 255, 0, 140),    # yellow
        (138, 43, 226, 130),   # purple
        (50, 205, 50, 140),    # green
        (255, 0, 60, 150),     # red
    ]

    for color in splatter_colors:
        for _ in range(4):
            x = random.randint(400, 880)
            y = random.randint(80, 600)
            r = random.randint(20, 70)
            sdraw.ellipse([x - r, y - r, x + r, y + r], fill=color)
            for _ in range(3):
                dx = random.randint(-80, 80)
                dy = random.randint(-80, 80)
                sr = random.randint(5, 20)
                sdraw.ellipse(
                    [x + dx - sr, y + dy - sr, x + dx + sr, y + dy + sr],
                    fill=color,
                )

    return splat_canvas


def _compose_scene(webcam, splat_canvas):
    """Compose scene canvas: splatters on top of blurred webcam (ambient map)."""
    ambient = webcam.filter(ImageFilter.GaussianBlur(radius=50))
    scene = ambient.convert("RGBA")
    scene = Image.alpha_composite(scene, splat_canvas)
    return scene.convert("RGB")
