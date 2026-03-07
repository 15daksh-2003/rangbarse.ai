# Image encoding/decoding utilities for RangBarse.ai inference server.

import io
import base64

from PIL import Image


def decode_base64_image(data: str) -> Image.Image:
    """Decode a base64-encoded PNG string to a PIL Image.

    Handles data URLs (e.g. 'data:image/png;base64,...') by stripping the prefix.
    """
    if "base64," in data:
        data = data.split("base64,")[1]
    image_bytes = base64.b64decode(data)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def resize_for_inference(image: Image.Image, max_dim: int = 512) -> Image.Image:
    """Resize image preserving aspect ratio to fit within max_dim.

    Dimensions are rounded to multiples of 8 (required by Stable Diffusion).
    """
    orig_w, orig_h = image.size
    scale = max_dim / max(orig_w, orig_h)
    new_w = max(int(orig_w * scale) // 8 * 8, 8)
    new_h = max(int(orig_h * scale) // 8 * 8, 8)
    return image.resize((new_w, new_h), Image.LANCZOS)


def encode_image_to_png(image: Image.Image) -> bytes:
    """Encode a PIL Image to PNG bytes."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()
