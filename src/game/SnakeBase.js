import Phaser from "phaser"
import { HEAD_RADIUS, BODY_RADIUS, SEGMENT_SPACING } from "./constants"

/**
 * SnakeBase — shared logic for both Snake (player) and EnemySnake (AI).
 * History tracking, body update, segment drawing, and eye positioning
 * all live here exactly once. Subclasses only add what's unique to them.
 */
export default class SnakeBase {

  // ─── Texture helpers (static so they run once per game, not per instance) ──

  static buildSegmentTexture(scene, key, radius, color) {
    if (scene.textures.exists(key)) return
    const size = Math.ceil(radius * 4.4)   // fits the outermost glow ring
    const cx = size / 2, cy = size / 2
    const g = scene.add.graphics()
    g.fillStyle(color, 0.18);  g.fillCircle(cx, cy, radius * 2.2)
    g.fillStyle(color, 0.35);  g.fillCircle(cx, cy, radius * 1.5)
    g.fillStyle(color, 1);     g.fillCircle(cx, cy, radius)
    g.fillStyle(0xffffff, 0.4);g.fillCircle(cx - radius * 0.28, cy - radius * 0.28, radius * 0.3)
    g.generateTexture(key, size, size)
    g.destroy()
  }

  static buildEyeTexture(scene) {
    if (scene.textures.exists("eye_dot")) return
    const g = scene.add.graphics()
    g.fillStyle(0xffffff, 1); g.fillCircle(5, 5, 5)
    g.fillStyle(0x000000, 1); g.fillCircle(6.5, 5, 2.5)
    g.generateTexture("eye_dot", 10, 10)
    g.destroy()
  }

  // ─── Constructor ──────────────────────────────────────────────────────────

  constructor(scene, x, y, headColor, bodyColor) {
    this.scene      = scene
    this.headColor  = headColor
    this.bodyColor  = bodyColor
    this.spacing    = SEGMENT_SPACING
    this.direction  = new Phaser.Math.Vector2(1, 0)
    this.body       = []

    // Float32Array ring buffer — stores x,y pairs as raw floats.
    // Avoids allocating a new {x,y} object every frame (1000 obj/sec per snake = GC pressure).
    // Layout: [x0, y0, x1, y1, ...] — each position takes 2 slots.
    this._HIST_CAP  = 1000          // max positions stored
    this._histBuf   = new Float32Array(this._HIST_CAP * 2)
    this._histHead  = 0             // write pointer (next slot to write)
    this._histCount = 0             // how many positions are valid

    // Pre-bake segment textures (no-op if already cached)
    SnakeBase.buildSegmentTexture(scene, `seg_head_${headColor}`, HEAD_RADIUS, headColor)
    SnakeBase.buildSegmentTexture(scene, `seg_body_${bodyColor}`, BODY_RADIUS, bodyColor)
    SnakeBase.buildEyeTexture(scene)

    // Head — Image from baked texture, physics body attached
    this.head = scene.add.image(x, y, `seg_head_${headColor}`).setDepth(11)
    scene.physics.add.existing(this.head)
    // Texture is radius*4.4 wide. With centered image origin,
    // the arcade body top-left is already at image center - textureSize/2.
    // To center the circle hitbox: offset = textureHalf - circleRadius
    const headTexSize   = Math.ceil(HEAD_RADIUS * 4.4)
    const headHitOffset = headTexSize / 2 - HEAD_RADIUS
    this.head.body.setCircle(HEAD_RADIUS, headHitOffset, headHitOffset)
    this.head.body.setCollideWorldBounds(true)

    // Eyes
    this.eyeL = scene.add.image(0, 0, "eye_dot").setDepth(12)
    this.eyeR = scene.add.image(0, 0, "eye_dot").setDepth(12)
  }

  // ─── Shared per-frame update steps ───────────────────────────────────────

  _updateHistory() {
    // Write head position into ring buffer at current write slot
    const slot = this._histHead * 2
    this._histBuf[slot]     = this.head.x
    this._histBuf[slot + 1] = this.head.y
    // Advance write pointer, wrapping around
    this._histHead = (this._histHead + 1) % this._HIST_CAP
    if (this._histCount < this._HIST_CAP) this._histCount++
  }

  // Read position N steps back from the most recent entry
  _historyAt(n) {
    if (n >= this._histCount) return null
    // Most recent entry is at (histHead - 1), going backwards wraps around
    const idx  = (this._histHead - 1 - n + this._HIST_CAP) % this._HIST_CAP
    const slot = idx * 2
    return { x: this._histBuf[slot], y: this._histBuf[slot + 1] }
  }

  _updateBody() {
    for (let i = 0; i < this.body.length; i++) {
      const n  = Math.floor((i + 1) * this.spacing)
      const pt = this._historyAt(n)
      if (!pt) continue
      this.body[i].x = pt.x
      this.body[i].y = pt.y
    }
  }

  _updateEyes() {
    const angle  = this.direction.angle()
    const spread = 0.45
    const dist   = HEAD_RADIUS * 0.6
    this.eyeL.setPosition(
      this.head.x + Math.cos(angle - spread) * dist,
      this.head.y + Math.sin(angle - spread) * dist
    )
    this.eyeR.setPosition(
      this.head.x + Math.cos(angle + spread) * dist,
      this.head.y + Math.sin(angle + spread) * dist
    )
  }

  // ─── Grow ─────────────────────────────────────────────────────────────────

  _addBodySegment() {
    const ref = this.body.length > 0 ? this.body[this.body.length - 1] : this.head
    const seg = this.scene.add.image(ref.x, ref.y, `seg_body_${this.bodyColor}`).setDepth(10)
    this.body.push(seg)
    return seg
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  getBodyParts() { return this.body }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    this.head.destroy()
    this.body.forEach(s => s.destroy())
    this.eyeL.destroy()
    this.eyeR.destroy()
  }
}
