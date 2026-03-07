// Client-side style descriptions for CSS fallback tier and UI display.
// NOT sent to the GPU server — server uses its own tag-based prompts
// (see server/app/style_config.py for server-side prompt config).
export const STYLE_PROMPTS = {
  watercolor: `Transform this photo into a dreamy watercolor painting of a person celebrating the Indian festival of Holi. Make the colored powder splatters look like vibrant watercolor splashes with soft washes, wet-on-wet bleeding edges, and paint dripping. Add warm golden hour lighting. Keep the person recognizable but give it a masterpiece watercolor art style.`,

  bollywood: `Transform this photo into a cinematic Bollywood movie poster. Add dramatic studio lighting with colored powder explosions in the background. Increase contrast and saturation. Add subtle lens flare and bokeh effects. Make it look like a professional movie poster celebrating Holi, the Indian festival of colors.`,

  rangoli: `Transform this photo into an artistic portrait surrounded by intricate geometric rangoli patterns made of colored powder. Make the existing color splatters flow into beautiful traditional Indian rangoli designs radiating outward. Use vibrant Holi festival colors. Blend flat rangoli art style with the portrait.`,
};
