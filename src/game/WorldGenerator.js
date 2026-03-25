import Phaser from "phaser"
import { CHUNK_SIZE, RENDER_DIST, WORLD_SIZE, GRID_CELL } from "./constants"

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
    // Neon border around world edges
    const gfx = this.scene.add.graphics().setDepth(1)
    gfx.lineStyle(6, 0x39ff14, 0.6)
    gfx.strokeRect(4, 4, WORLD_SIZE - 8, WORLD_SIZE - 8)
    gfx.lineStyle(2, 0x39ff14, 0.2)
    gfx.strokeRect(14, 14, WORLD_SIZE - 28, WORLD_SIZE - 28)
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

    // Spawn food
    const foodCount = Phaser.Math.Between(8, 14)
    for (let i = 0; i < foodCount; i++) {
      const x = Phaser.Math.Between(sx + 20, sx + CHUNK_SIZE - 20)
      const y = Phaser.Math.Between(sy + 20, sy + CHUNK_SIZE - 20)
      objs.push(this.foodManager.spawnFood(x, y))
    }

    // Neon rock decorations
    const rockCount = Phaser.Math.Between(0, 3)
    for (let i = 0; i < rockCount; i++) {
      const rx = Phaser.Math.Between(sx + 40, sx + CHUNK_SIZE - 40)
      const ry = Phaser.Math.Between(sy + 40, sy + CHUNK_SIZE - 40)
      objs.push(...this._spawnRock(rx, ry))
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
