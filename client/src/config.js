export const CONFIG = {
  // Game
  GAME_DURATION_MS: 30000,
  TARGET_FPS: 30,

  // Canvas
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  MIRROR: true,

  // Balloons
  BALLOON_RADIUS_MIN: 15,
  BALLOON_RADIUS_MAX: 50,
  BALLOON_SPEED_MIN: 2,
  BALLOON_SPEED_MAX: 6,
  BALLOON_SPAWN_INTERVAL_MS: 400,
  BALLOON_SPAWN_INTERVAL_BEAT_MS: 200,
  MAX_ACTIVE_BALLOONS: 15,

  // Spawn Patterns (all spawn from edges, fly toward user)
  PATTERN_ROTATE_INTERVAL_MS: 7500,
  PATTERNS: ['EDGES_IN', 'TOP_RAIN', 'SIDE_SWEEP', 'SPIRAL'],

  // Color Phases
  COLOR_PHASES: [
    { start: 0, end: 10000, palette: ['#FFB6C1', '#ADD8E6', '#FFFACD', '#98FB98'] },
    { start: 10000, end: 20000, palette: ['#FF00FF', '#00FFFF', '#FFA500', '#00FF00'] },
    { start: 20000, end: 28000, palette: ['#DC143C', '#1E90FF', '#FF69B4', '#FFD700'] },
    { start: 28000, end: 30000, palette: ['#FF0000', '#FF00FF', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF6600', '#FF1493'] },
  ],

  // Collision
  BODY_HITBOX_PADDING: 20,
  HAND_CATCH_RADIUS: 60,
  FLICK_VELOCITY_THRESHOLD: 8,

  // Splatters (base sizes at 1280px canvas width, auto-scaled for larger screens)
  SPLATTER_SIZE_MIN: 100,
  SPLATTER_SIZE_MAX: 200,
  SPLATTER_OPACITY: 0.6,
  DRIP_SPEED: 0.3,
  DRIP_LENGTH_MAX: 100,

  // Scoring
  SCORE_DODGE: 10,
  SCORE_THROW: 25,

  // Audio (tuned for DJ Dhol Holi mix — strong bass, ~130-140 BPM)
  BEAT_THRESHOLD: 160,
  BEAT_COOLDOWN_MS: 250,

  // Snapshots
  MAX_MID_GAME_SNAPSHOTS: 3,
  SNAPSHOT_COOLDOWN_MS: 5000,

  // AI
  AI_API_ENDPOINT: '/api/generate',
  AI_HEALTH_ENDPOINT: '/api/health',
  AI_TIMEOUT_MS: 30000,

  // Blend modes for client-side compositing (post-AI art generation)
  // Mirrors server/quality/compositor.py BLEND_CONFIG — keep in sync.
  BLEND_MODES: {
    watercolor: { mode: 'multiply',   opacity: 0.75 },
    bollywood:  { mode: 'overlay',    opacity: 0.90 },
    rangoli:    { mode: 'soft-light', opacity: 0.70 },
  },

  // Card
  CARD_WIDTH: 1080,
  CARD_HEIGHT: 1920,
};
