// ─── World ───────────────────────────────────────────────────────────────────
export const WORLD_SIZE     = 6000
export const BORDER_MARGIN  = 150   // nothing spawns within this many px of any edge
export const CHUNK_SIZE   = 600
export const RENDER_DIST  = 2

// ─── Snake ───────────────────────────────────────────────────────────────────
export const PLAYER_COLOR      = 0x39ff14   // neon green
export const PLAYER_GLOW       = "#39ff14"
export const BASE_SPEED        = 210
export const BOOST_SPEED       = 380
export const BOOST_DRAIN       = 1.8        // energy drained per frame while boosting
export const BOOST_REGEN       = 0.15       // base energy regen per frame (slow!)
export const BOOST_MAX         = 100
export const BOOST_COOLDOWN_MS = 2500       // ms after empty before regen starts
export const SEGMENT_SPACING   = 10
export const HEAD_RADIUS       = 13
export const BODY_RADIUS       = 10

// ─── Powerups ────────────────────────────────────────────────────────────────
export const POWERUP_TYPES = [
  { id: "boost_refill",   color: 0x00ffff,  glow: "#00ffff",  radius: 10, label: "⚡", desc: "Instant boost refill"          },
  { id: "boost_regen",    color: 0xffe600,  glow: "#ffe600",  radius: 10, label: "↑",  desc: "Faster boost regen (10s)"      },
  { id: "boost_capacity", color: 0xff7c2a,  glow: "#ff7c2a",  radius: 10, label: "◈",  desc: "Bigger boost tank (15s)"       },
]
export const POWERUP_SPAWN_INTERVAL = 8000  // ms between powerup spawns
export const POWERUP_LIFETIME       = 12000 // ms before a powerup disappears

// ─── Mirror world ─────────────────────────────────────────────────────────────
export const MIRROR_DIST = 400  // px from edge within which ghost copies are drawn

// ─── Enemies ─────────────────────────────────────────────────────────────────
export const MAX_ENEMIES = 15
export const ENEMY_COLORS = [
  { hex: 0xff2d78, glow: "#ff2d78", name: "Viper"    },
  { hex: 0x00f0ff, glow: "#00f0ff", name: "Glacier"  },
  { hex: 0xffe600, glow: "#ffe600", name: "Volt"      },
  { hex: 0xbf5fff, glow: "#bf5fff", name: "Phantom"  },
  { hex: 0xff7c2a, glow: "#ff7c2a", name: "Ember"    },
  { hex: 0x00ffaa, glow: "#00ffaa", name: "Toxin"    },
  { hex: 0xff4444, glow: "#ff4444", name: "Blaze"    },
  { hex: 0x44aaff, glow: "#44aaff", name: "Frost"    },
]

// ─── Food ────────────────────────────────────────────────────────────────────
export const FOOD_TIERS = [
  { radius: 5,  color: 0xff2d78, glow: "#ff2d78", points: 1  },
  { radius: 7,  color: 0x00f0ff, glow: "#00f0ff", points: 2  },
  { radius: 9,  color: 0xffe600, glow: "#ffe600", points: 3  },
  { radius: 11, color: 0xbf5fff, glow: "#bf5fff", points: 5  },
]

// ─── Rendering ───────────────────────────────────────────────────────────────
export const BG_COLOR        = 0x050a0f
export const GRID_COLOR      = 0x0a1a2a
export const GRID_CELL       = 80
