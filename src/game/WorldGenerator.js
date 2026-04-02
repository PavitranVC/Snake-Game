import Phaser from "phaser"
import PerlinNoise from "./PerlinNoise"
import { CHUNK_SIZE, RENDER_DIST, WORLD_SIZE, GRID_CELL, BORDER_MARGIN } from "./constants"

export default class WorldGenerator {
  constructor(scene, foodManager, cfg = {}) {
    this.scene          = scene
    this.foodManager    = foodManager
    this.activeChunks   = new Map()
    this._worldSize     = cfg.worldSize      ?? WORLD_SIZE
    this._borderMargin  = cfg.borderMargin   ?? BORDER_MARGIN
    this._levelColor    = cfg.colorHex       ?? 0x39ff14
    this._levelColorStr = cfg.color          ?? "#39ff14"

    // Terrain config — all levels use same small-bump style
    this._terrainDensity  = cfg.terrainDensity  ?? 0.62
    this._terrainGridSize = cfg.terrainGridSize  ?? 220   // min px between bump centers
    this._bumpCount       = cfg.terrainBumpCount ?? 2     // circles per bump cluster

    // New seed every session → different map every game
    this._noise = new PerlinNoise(Math.random())
    this._noiseScale = 0.006   // broad waves → natural clustering of open/obstacle zones

    // Static physics groups
    this.terrainGroup = scene.physics.add.staticGroup()  // bumps
    this.borderGroup  = scene.physics.add.staticGroup()  // kill walls at edges

    // Track occupied terrain cells so food never spawns on a bump
    this._occupiedCells = new Set()

    this._buildGridTexture()
    this._buildBorderWalls()
    this._buildBorderGlow()
  }

  // ─── Background ───────────────────────────────────────────────────────────

  _buildGridTexture() {
    const key = "grid_tile_" + this._levelColor
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.add.graphics({ x: -99999, y: -99999 })
      const s = GRID_CELL
      g.fillStyle(0x050a0f, 1);     g.fillRect(0, 0, s, s)
      g.lineStyle(1, 0x0a2040, 0.3); g.strokeRect(0, 0, s, s)
      g.fillStyle(0x0d3060, 0.55)
      g.fillCircle(0, 0, 1.5); g.fillCircle(s, 0, 1.5)
      g.fillCircle(0, s, 1.5); g.fillCircle(s, s, 1.5)
      g.generateTexture(key, s, s)
      g.destroy()
    }
    this.scene.add.tileSprite(
      this._worldSize / 2, this._worldSize / 2,
      this._worldSize, this._worldSize, key
    ).setDepth(0)
  }

  // ─── Border kill walls (thin invisible static bodies at each edge) ─────────

  _buildBorderWalls() {
    const W   = this._worldSize
    const T   = 16   // wall thickness in px

    // Top, Bottom, Left, Right — invisible static rectangles
    ;[
      [W / 2, T / 2,     W,   T  ],   // top
      [W / 2, W - T / 2, W,   T  ],   // bottom
      [T / 2, W / 2,     T,   W  ],   // left
      [W - T / 2, W / 2, T,   W  ],   // right
    ].forEach(([bx, by, bw, bh]) => {
      const wall = this.scene.add.rectangle(bx, by, bw, bh)
      wall.setVisible(false)
      this.scene.physics.add.existing(wall, true)
      this.borderGroup.add(wall)
    })
  }

  // ─── Border glow ──────────────────────────────────────────────────────────

  _buildBorderGlow() {
    const W = this._worldSize, VOID = 4000, col = this._levelColor

    // Void panels outside world
    const voidGfx = this.scene.add.graphics().setDepth(100)
    voidGfx.fillStyle(0x000000, 1)
    voidGfx.fillRect(-VOID, -VOID, W + VOID * 2, VOID)
    voidGfx.fillRect(-VOID, W,     W + VOID * 2, VOID)
    voidGfx.fillRect(-VOID, 0, VOID, W)
    voidGfx.fillRect(W,     0, VOID, W)

    // Neon border lines
    const gfx = this.scene.add.graphics().setDepth(101)
    gfx.lineStyle(14, col, 0.1);  gfx.strokeRect(0, 0, W, W)
    gfx.lineStyle(5,  col, 0.55); gfx.strokeRect(3, 3, W - 6, W - 6)
    gfx.lineStyle(2,  col, 1.0);  gfx.strokeRect(8, 8, W - 16, W - 16)
  }

  // ─── Chunk system ──────────────────────────────────────────────────────────

  update(px, py) {
    const cx = Math.floor(px / CHUNK_SIZE)
    const cy = Math.floor(py / CHUNK_SIZE)
    const needed = new Set()

    for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++) {
      for (let dy = -RENDER_DIST; dy <= RENDER_DIST; dy++) {
        const key = (cx + dx) + "," + (cy + dy)
        needed.add(key)
        if (!this.activeChunks.has(key)) this._generateChunk(cx + dx, cy + dy)
      }
    }

    for (const key of this.activeChunks.keys()) {
      if (!needed.has(key)) this._removeChunk(key)
    }
  }

  _generateChunk(cx, cy) {
    const key  = cx + "," + cy
    const objs = []
    const sx   = cx * CHUNK_SIZE
    const sy   = cy * CHUNK_SIZE
    const W    = this._worldSize
    const M    = this._borderMargin

    if (sx < 0 || sy < 0 || sx > W || sy > W) {
      this.activeChunks.set(key, objs)
      return
    }

    const minX = Math.max(sx + 20, M)
    const maxX = Math.min(sx + CHUNK_SIZE - 20, W - M)
    const minY = Math.max(sy + 20, M)
    const maxY = Math.min(sy + CHUNK_SIZE - 20, W - M)

    if (minX >= maxX || minY >= maxY) {
      this.activeChunks.set(key, objs)
      return
    }

    // Terrain bumps
    this._generateBumps(minX, maxX, minY, maxY, objs)

    // Food avoiding bumps
    const foodCount = Phaser.Math.Between(8, 14)
    let placed = 0, attempts = 0
    while (placed < foodCount && attempts < foodCount * 5) {
      attempts++
      const fx = Phaser.Math.Between(minX, maxX)
      const fy = Phaser.Math.Between(minY, maxY)
      if (!this._isNearBump(fx, fy, 50)) {
        objs.push(this.foodManager.spawnFood(fx, fy))
        placed++
      }
    }

    this.activeChunks.set(key, objs)
  }

  // ─── Perlin bump generation ────────────────────────────────────────────────

  _generateBumps(minX, maxX, minY, maxY, objs) {
    const gs      = this._terrainGridSize
    const W       = this._worldSize
    const M       = this._borderMargin
    const centerX = W / 2, centerY = W / 2
    const CLEAR   = 350   // keep spawn area open

    const gxStart = Math.floor(minX / gs)
    const gxEnd   = Math.ceil (maxX / gs)
    const gyStart = Math.floor(minY / gs)
    const gyEnd   = Math.ceil (maxY / gs)

    for (let gx = gxStart; gx < gxEnd; gx++) {
      for (let gy = gyStart; gy < gyEnd; gy++) {
        // Cell center in world space
        const wx = gx * gs + gs / 2
        const wy = gy * gs + gs / 2

        if (wx < M || wx > W - M || wy < M || wy > W - M) continue

        // Keep centre clear
        const d = Math.sqrt((wx - centerX) ** 2 + (wy - centerY) ** 2)
        if (d < CLEAR) continue

        const cellKey = gx + "," + gy
        if (this._occupiedCells.has(cellKey)) continue

        // Sample noise — value 0..1
        const n = this._noise.fbm(wx * this._noiseScale, wy * this._noiseScale, 3)

        if (n > this._terrainDensity) {
          this._placeBump(wx, wy, n, objs)
          this._occupiedCells.add(cellKey)
        }
      }
    }
  }

  _placeBump(cx, cy, noiseVal, objs) {
    const col      = this._levelColor
    const strength = Math.min(1, (noiseVal - this._terrainDensity) / (1 - this._terrainDensity))

    // Small radius: 14–24px. Never big enough to block a whole corridor.
    const baseR = 14 + strength * 10   // 14px min, 24px max

    const gfx = this.scene.add.graphics().setDepth(3)

    // How many circles in this bump cluster (1–bumpCount)
    const count = 1 + Math.floor(strength * (this._bumpCount - 1))

    for (let i = 0; i < count; i++) {
      // Offset each circle slightly — use noise for natural look, not random
      const angle  = (i / count) * Math.PI * 2 + this._noise.get(cx * 0.03 + i, cy * 0.03) * 2
      const offset = i === 0 ? 0 : baseR * 0.7   // first circle at center, rest nearby
      const bx     = cx + Math.cos(angle) * offset
      const by_    = cy + Math.sin(angle) * offset
      const r      = baseR * (1 - i * 0.15)        // each extra circle slightly smaller

      // Outer glow (pure visual, no physics)
      gfx.fillStyle(col, 0.08); gfx.fillCircle(bx, by_, r * 2.0)
      gfx.fillStyle(col, 0.18); gfx.fillCircle(bx, by_, r * 1.4)

      // Dark solid core
      gfx.fillStyle(0x060e0a, 1); gfx.fillCircle(bx, by_, r)

      // Neon ring
      gfx.lineStyle(1.5, col, 0.85); gfx.strokeCircle(bx, by_, r)

      // Tiny center dot
      gfx.fillStyle(col, 1); gfx.fillCircle(bx, by_, 2.5)
    }

    objs.push(gfx)

    // Single physics circle for the main bump body
    const physR = baseR + 4   // slightly larger than visual for forgiving collision
    const block = this.scene.add.circle(cx, cy, physR)
    block.setVisible(false)
    this.scene.physics.add.existing(block, true)
    // Set the circle body correctly
    block.body.setCircle(physR)
    this.terrainGroup.add(block)
    objs.push(block)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _isNearBump(wx, wy, clearance) {
    const gs = this._terrainGridSize
    const gx = Math.round(wx / gs)
    const gy = Math.round(wy / gs)
    const cells = Math.ceil(clearance / gs) + 1
    for (let dx = -cells; dx <= cells; dx++) {
      for (let dy = -cells; dy <= cells; dy++) {
        if (this._occupiedCells.has((gx + dx) + "," + (gy + dy))) return true
      }
    }
    return false
  }

  _removeChunk(key) {
    const objs = this.activeChunks.get(key)
    if (!objs) return
    objs.forEach(o => {
      if (!o || !o.active) return
      if (this.terrainGroup.contains(o)) this.terrainGroup.remove(o, true, true)
      else o.destroy()
    })
    this.activeChunks.delete(key)

    // Clear occupied cells for this chunk
    const [cxS, cyS] = key.split(",")
    const cx = +cxS, cy = +cyS
    const gs = this._terrainGridSize
    const sx = cx * CHUNK_SIZE, sy = cy * CHUNK_SIZE
    for (let gx = Math.floor(sx/gs) - 1; gx <= Math.ceil((sx+CHUNK_SIZE)/gs) + 1; gx++) {
      for (let gy = Math.floor(sy/gs) - 1; gy <= Math.ceil((sy+CHUNK_SIZE)/gs) + 1; gy++) {
        this._occupiedCells.delete(gx + "," + gy)
      }
    }
  }
}
