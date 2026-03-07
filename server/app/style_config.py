# Per-style AI generation configuration for RangBarse.ai
# Source of truth for all style prompts, strengths, and inference parameters.

from dataclasses import dataclass


@dataclass(frozen=True)
class StyleConfig:
    """Configuration for a single AI art style."""
    prompt: str
    strength: float
    guidance_scale: float


# --- Style Definitions ---
# Input is scene canvas (splatters on ambient map) — no face, no person.
# Strength controls how much splatter shapes change:
#   0.40-0.50: keep shape, gain artistic texture (watercolor bleeds, glow)
#   0.55-0.65: moderate morph (some shape change, more creative)
#   0.70+: reimagined entirely (too wild — loses paint blob identity)
# Per-style guidance_scale controls prompt adherence vs natural look.

STYLE_CONFIGS = {
    "watercolor": StyleConfig(
        prompt=(
            "watercolor painting, soft color washes, wet-on-wet blending, "
            "paint dripping, vibrant Holi powder colors, warm golden light, "
            "artistic, masterpiece, best quality"
        ),
        strength=0.45,
        guidance_scale=6.5,
    ),
    "bollywood": StyleConfig(
        prompt=(
            "cinematic colorful powder clouds, dramatic lighting, glowing colors, "
            "high contrast, vivid saturation, soft bokeh, "
            "Holi festival celebration, best quality"
        ),
        strength=0.40,
        guidance_scale=7.0,
    ),
    "rangoli": StyleConfig(
        prompt=(
            "colorful powder arranged in geometric rangoli patterns, "
            "traditional Indian mandala designs, vibrant Holi festival colors, "
            "ornate symmetrical details, best quality"
        ),
        strength=0.55,
        guidance_scale=8.5,
    ),
}

NEGATIVE_PROMPT = (
    "ugly, low quality, blurry, watermark, text, signature, "
    "photograph, photorealistic, face, person, human"
)

# Low-coverage boost: when coverage < this %, increase strength
LOW_COVERAGE_THRESHOLD = 15
LOW_COVERAGE_STRENGTH = 0.70

DEFAULT_STYLE = "watercolor"
DEFAULT_INFERENCE_STEPS = 40


def get_style_config(style_name: str) -> StyleConfig:
    """Get style config by name, falling back to watercolor."""
    return STYLE_CONFIGS.get(style_name, STYLE_CONFIGS[DEFAULT_STYLE])


def get_all_style_names() -> list[str]:
    """Return all available style names."""
    return list(STYLE_CONFIGS.keys())


def resolve_strength(style_name: str, client_strength: float, coverage: int) -> float:
    """Determine effective strength based on priority:
    1. Client-provided (if > 0)
    2. Low-coverage boost (if coverage < threshold)
    3. Per-style default
    """
    if client_strength > 0:
        return client_strength

    if coverage < LOW_COVERAGE_THRESHOLD:
        return LOW_COVERAGE_STRENGTH

    return get_style_config(style_name).strength
