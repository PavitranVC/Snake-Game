import Phaser from "phaser"
import { CHUNK_SIZE, RENDER_DIST, WORLD_SIZE, GRID_CELL, BORDER_MARGIN } from "./constants"

export default class WorldGenerator {
  constructor(scene, foodManager) {
    this.scene        = scene
    this.foodManager  = foodManager
    this.activeChunks = new Map()

    this._buildGridTexture()
    this._buildBorderGlow()
  }

  // Seamless dot-grid tile
  _buildGridTexture() {
    if (this.scene.textures.exists("grid_tile")) return
    const size = GRID_CELL
    const g = this.scene.add.graphics()
    // Dark fill
    g.fillStyle(0x050a0f, 1)
    g.fillRect(0, 0, size, size)
    // Subtle grid lines
    g.lineStyle(1, 0x0a2040, 0.4)
    g.strokeRect(0, 0, size, size)
    // Corner dots
    g.fillStyle(0x0d3060, 0.7)
    g.fillCircle(0, 0, 1.5)
    g.fillCircle(size, 0, 1.5)
    g.fillCircle(0, size, 1.5)
    g.fillCircle(size, size, 1.5)
    g.generateTexture("grid_tile", size, size)
    g.destroy()

    // Tiled background covering entire world
    this.scene.add.tileSprite(
      WORLD_SIZE / 2,
      WORLD_SIZE / 2,
      WORLD_SIZE,
      WORLD_SIZE,
      "grid_tile"
    ).setDepth(0)
  }

  _buildBorderGlow() {
    const W = WORLD_SIZE
    const VOID = 4000   // how far the void extends beyond each edge (covers any camera view)

    // ── Void panels — solid black rectangles placed outside each world edge ──
    // They sit at depth 100 so they always render on top of everything in the world.
    // Four panels: top, bottom, left, right — each extends VOID px beyond the edge.
    const voidGfx = this.scene.add.graphics().setDepth(100)
    voidGfx.fillStyle(0x000000, 1)
    // Top void
    voidGfx.fillRect(-VOID, -VOID, W + VOID * 2, VOID)
    // Bottom void
    voidGfx.fillRect(-VOID, W, W + VOID * 2, VOID)
    // Left void
    voidGfx.fillRect(-VOID, 0, VOID, W)
    // Right void
    voidGfx.fillRect(W, 0, VOID, W)

    // ── Neon border glow on the inside face of the void ──
    const gfx = this.scene.add.graphics().setDepth(101)
    // Thick outer glow
    gfx.lineStyle(12, 0x39ff14, 0.15)
    gfx.strokeRect(0, 0, W, W)
    // Mid glow
    gfx.lineStyle(6, 0x39ff14, 0.5)
    gfx.strokeRect(3, 3, W - 6, W - 6)
    // Sharp inner line
    gfx.lineStyle(2, 0x39ff14, 1.0)
    gfx.strokeRect(8, 8, W - 16, W - 16)
    // Inner warning band — danger zone colour fade
    gfx.lineStyle(1, 0xff2d78, 0.2)
    gfx.strokeRect(BORDER_MARGIN, BORDER_MARGIN, W - BORDER_MARGIN * 2, W - BORDER_MARGIN * 2)
  }

  update(px, py) {
    const cx = Math.floor(px / CHUNK_SIZE)
    const cy = Math.floor(py / CHUNK_SIZE)
    const needed = new Set()

    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++) {
      for (let dy = -RENDER_DIST; dy <= RENDER_DIST; dy++) {
        const key = `${cx + dx},${cy + dy}`
        needed.add(key)
        if (!this.activeChunks.has(key)) this._generateChunk(cx + dx, cy + dy)
      }
    }

    for (const key of this.activeChunks.keys()) {
      if (!needed.has(key)) this._removeChunk(key)
    }
  }

  _generateChunk(cx, cy) {
    const key = `${cx},${cy}`
    const objs = []
    const sx = cx * CHUNK_SIZE
    const sy = cy * CHUNK_SIZE

    // Clamp to world
    if (sx < 0 || sy < 0 || sx > WORLD_SIZE || sy > WORLD_SIZE) {
      this.activeChunks.set(key, objs)
      return
    }

    // Clamp spawn area to world interior — nothing within BORDER_MARGIN of any edge
    const minX = Math.max(sx + 20, BORDER_MARGIN)
    const maxX = Math.min(sx + CHUNK_SIZE - 20, WORLD_SIZE - BORDER_MARGIN)
    const minY = Math.max(sy + 20, BORDER_MARGIN)
    const maxY = Math.min(sy + CHUNK_SIZE - 20, WORLD_SIZE - BORDER_MARGIN)

    // Skip chunk entirely if it falls fully outside the safe zone
    if (minX >= maxX || minY >= maxY) {
      this.activeChunks.set(key, objs)
      return
    }

    // Spawn food within safe bounds
    const foodCount = Phaser.Math.Between(8, 14)
    for (let i = 0; i < foodCount; i++) {
      const x = Phaser.Math.Between(minX, maxX)
      const y = Phaser.Math.Between(minY, maxY)
      objs.push(this.foodManager.spawnFood(x, y))
    }

    // Neon rock decorations within safe bounds
    const rockMinX = Math.max(sx + 40, BORDER_MARGIN)
    const rockMaxX = Math.min(sx + CHUNK_SIZE - 40, WORLD_SIZE - BORDER_MARGIN)
    const rockMinY = Math.max(sy + 40, BORDER_MARGIN)
    const rockMaxY = Math.min(sy + CHUNK_SIZE - 40, WORLD_SIZE - BORDER_MARGIN)
    if (rockMinX < rockMaxX && rockMinY < rockMaxY) {
      const rockCount = Phaser.Math.Between(0, 3)
      for (let i = 0; i < rockCount; i++) {
        const rx = Phaser.Math.Between(rockMinX, rockMaxX)
        const ry = Phaser.Math.Between(rockMinY, rockMaxY)
        objs.push(...this._spawnRock(rx, ry))
      }
    }

    this.activeChunks.set(key, objs)
  }

  _spawnRock(x, y) {
    // Single graphics object per rock cluster — much cheaper than N separate objects
    const colors = [0x1a3a5c, 0x0d2a44, 0x112233]
    const baseColor = Phaser.Math.RND.pick(colors)
    const count = Phaser.Math.Between(3, 7)
    const g = this.scene.add.graphics().setDepth(2)
    for (let i = 0; i < count; i++) {
      const ox = Phaser.Math.Between(-30, 30)
      const oy = Phaser.Math.Between(-30, 30)
      const r  = Phaser.Math.Between(8, 20)
      g.fillStyle(baseColor, 1)
      g.fillCircle(x + ox, y + oy, r)
      g.lineStyle(1, 0x1a6090, 0.4)
      g.strokeCircle(x + ox, y + oy, r)
    }
    return [g]
  }

  _removeChunk(key) {
    const objs = this.activeChunks.get(key)
    if (!objs) return
    objs.forEach(o => { if (o && o.destroy) o.destroy() })
    this.activeChunks.delete(key)
  }
}
