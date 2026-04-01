// ─── Planet / Sphere ─────────────────────────────────────────────────────────
export const PLANET_RADIUS_L1 = 800
export const PLANET_RADIUS_L2 = 560
export const PLANET_RADIUS_L3 = 360

export const SNAKE_SURFACE_OFFSET    = 4
export const ANGULAR_SPEED           = 0.55
export const ANGULAR_BOOST_SPEED     = 0.95
export const ANGULAR_SEGMENT_SPACING = 0.018

export const CAM_HEIGHT_FACTOR = 0.28
export const CAM_BACK_FACTOR   = 0.45
export const CAM_LERP          = 0.07

// ─── Snake ───────────────────────────────────────────────────────────────────
export const PLAYER_COLOR      = 0x39ff14
export const PLAYER_GLOW       = "#39ff14"
export const BASE_SPEED        = 210
export const BOOST_SPEED       = 380
export const BOOST_DRAIN       = 1.8
export const BOOST_REGEN       = 0.15
export const BOOST_MAX         = 100
export const BOOST_COOLDOWN_MS = 2500
export const SEGMENT_SPACING   = 10
export const HEAD_RADIUS       = 13
export const BODY_RADIUS       = 10

// ─── Powerups ────────────────────────────────────────────────────────────────
export const POWERUP_TYPES = [
  { id: "boost_refill",   color: 0x00ffff, glow: "#00ffff", radius: 10, label: "⚡", desc: "Instant boost refill"     },
  { id: "boost_regen",    color: 0xffe600, glow: "#ffe600", radius: 10, label: "↑",  desc: "Faster boost regen (10s)" },
  { id: "boost_capacity", color: 0xff7c2a, glow: "#ff7c2a", radius: 10, label: "◈",  desc: "Bigger boost tank (15s)"  },
]
export const POWERUP_SPAWN_INTERVAL = 8000
export const POWERUP_LIFETIME       = 12000

// ─── Enemies ─────────────────────────────────────────────────────────────────
export const ENEMY_COLORS = [
  { hex: 0xff2d78, glow: "#ff2d78", name: "Viper"   },
  { hex: 0x00f0ff, glow: "#00f0ff", name: "Glacier" },
  { hex: 0xffe600, glow: "#ffe600", name: "Volt"    },
  { hex: 0xbf5fff, glow: "#bf5fff", name: "Phantom" },
  { hex: 0xff7c2a, glow: "#ff7c2a", name: "Ember"   },
  { hex: 0x00ffaa, glow: "#00ffaa", name: "Toxin"   },
  { hex: 0xff4444, glow: "#ff4444", name: "Blaze"   },
  { hex: 0x44aaff, glow: "#44aaff", name: "Frost"   },
]

// ─── Food ────────────────────────────────────────────────────────────────────
export const FOOD_TIERS = [
  { radius: 5,  color: 0xff2d78, glow: "#ff2d78", points: 1 },
  { radius: 7,  color: 0x00f0ff, glow: "#00f0ff", points: 2 },
  { radius: 9,  color: 0xffe600, glow: "#ffe600", points: 3 },
  { radius: 11, color: 0xbf5fff, glow: "#bf5fff", points: 5 },
]

// ─── Legacy flat world (used by UIScene minimap fallback) ─────────────────────
export const WORLD_SIZE    = 4000
export const BORDER_MARGIN = 150
export const BG_COLOR      = 0x050a0f
export const GRID_COLOR    = 0x0a1a2a
export const GRID_CELL     = 80
