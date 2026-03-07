# Python simulation of client-side compositing (blend modes + lighting).
# Mirrors the logic in client/src/render/canvasManager.js composeAIArt().
# Used by the quality framework to produce final composited images without a browser.

import numpy as np
from PIL import Image, ImageDraw


# Blend config — mirrors CONFIG.BLEND_MODES in client/src/config.js
BLEND_CONFIG = {
    'watercolor': {'mode': 'multiply',   'opacity': 0.75},
    'bollywood':  {'mode': 'overlay',    'opacity': 0.90},
    'rangoli':    {'mode': 'soft-light', 'opacity': 0.70},
}


def client_compose(webcam, transformed, style):
    """Simulate client-side compositing: webcam + transformed canvas + lighting overlay.

    Args:
        webcam: PIL Image (RGB) — raw webcam frame
        transformed: PIL Image (RGB) — server-returned transformed canvas
        style: str — style name for blend mode selection

    Returns:
        PIL Image (RGB) — final composited result
    """
    w, h = webcam.size

    if transformed.size != (w, h):
        transformed = transformed.resize((w, h), Image.LANCZOS)

    wc = np.array(webcam).astype(np.float32) / 255.0
    tr = np.array(transformed).astype(np.float32) / 255.0

    cfg = BLEND_CONFIG.get(style, BLEND_CONFIG['watercolor'])

    if cfg['mode'] == 'multiply':
        blended = wc * tr
    elif cfg['mode'] == 'overlay':
        blended = np.where(wc < 0.5, 2 * wc * tr, 1 - 2 * (1 - wc) * (1 - tr))
    elif cfg['mode'] == 'soft-light':
        blended = (1 - 2 * tr) * wc * wc + 2 * tr * wc
    else:
        blended = tr

    result = wc * (1 - cfg['opacity']) + blended * cfg['opacity']
    result = np.clip(result * 255, 0, 255).astype(np.uint8)
    result_img = Image.fromarray(result)

    return apply_lighting(result_img, style)


def apply_lighting(img, style):
    """Apply style-specific lighting overlay.

    Mirrors _applyLighting() in canvasManager.js.
    """
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    if style == 'watercolor':
        for r in range(max(w, h) // 2, 0, -5):
            t = r / (max(w, h) // 2)
            alpha = int(15 * (1 - t) + 10 * t)
            red = int(255 * (1 - t) + 100 * t)
            green = int(220 * (1 - t) + 130 * t)
            blue = int(150 * (1 - t) + 180 * t)
            draw.ellipse(
                [w // 2 - r, h // 2 - r, w // 2 + r, h // 2 + r],
                fill=(red, green, blue, alpha),
            )
    elif style == 'bollywood':
        for r in range(max(w, h), 0, -5):
            t = r / max(w, h)
            if t > 0.3:
                alpha = int(180 * (t - 0.3) / 0.7)
                draw.ellipse(
                    [w // 2 - r, h // 2 - r, w // 2 + r, h // 2 + r],
                    fill=(10, 5, 0, alpha),
                )
        golden = Image.new("RGBA", (w, h), (255, 180, 50, 12))
        overlay = Image.alpha_composite(overlay, golden)
    elif style == 'rangoli':
        for r in range(max(w, h) // 2, 0, -5):
            t = r / (max(w, h) // 2)
            alpha = int(8 + 4 * abs(t - 0.5))
            red = int(255 * (1 - t) + 138 * t)
            green = int(20 * (1 - t) + 43 * t)
            blue = int(147 * (1 - t) + 226 * t)
            draw.ellipse(
                [w // 2 - r, h // 2 - r, w // 2 + r, h // 2 + r],
                fill=(red, green, blue, alpha),
            )

    result = img.convert("RGBA")
    result = Image.alpha_composite(result, overlay)
    return result.convert("RGB")
