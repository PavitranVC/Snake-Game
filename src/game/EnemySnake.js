import Phaser from "phaser"
import SnakeBase from "./SnakeBase"
import { ENEMY_COLORS, HEAD_RADIUS } from "./constants"

export default class EnemySnake extends SnakeBase {
  constructor(scene, x, y, colorIndex) {
    const palette = ENEMY_COLORS[colorIndex % ENEMY_COLORS.length]
    super(scene, x, y, palette.hex, palette.hex)

    this.colorHex  = palette.hex
    this.snakeName = palette.name + " #" + (colorIndex + 1)

    this.speed       = Phaser.Math.Between(110, 160)
    this.turnSpeed   = Phaser.Math.FloatBetween(1.8, 3.2)
    this.direction   = new Phaser.Math.Vector2(
      Phaser.Math.FloatBetween(-1, 1),
      Phaser.Math.FloatBetween(-1, 1)
    ).normalize()

    this.target       = null
    this.wanderAngle  = Phaser.Math.FloatBetween(0, Math.PI * 2)
    this._targetTimer = Math.floor(Math.random() * 20) // stagger scans

    // Start with 6 body segments
    for (let i = 0; i < 6; i++) this._addBodySegment()

    // Floating name label above head
    this.label = scene.add.text(x, y - HEAD_RADIUS - 16, palette.name, {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "10px",
      color:      palette.glow,
      stroke:     "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(13)
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  update(foodGroup, player, allEnemies) {
    this._findTarget(foodGroup, player, allEnemies)
    this._move()
    this._updateHistory()   // inherited from SnakeBase
    this._updateBody()      // inherited from SnakeBase
    this._updateEyes()      // inherited from SnakeBase
    this._updateLabel()
  }

  // ─── AI ───────────────────────────────────────────────────────────────────

  _findTarget(foodGroup, player, allEnemies) {
    // Throttle: staggered so not all enemies scan the same frame
    this._targetTimer++
    if (this._targetTimer < 20) return
    this._targetTimer = 0

    const hx = this.head.x, hy = this.head.y
    const myLen = this.body.length

    // ── 1. Flee from anything dangerous nearby ────────────────────────
    // Flee from player
    const pdx = hx - player.x, pdy = hy - player.y
    const pd  = Math.sqrt(pdx * pdx + pdy * pdy)
    if (pd < 220) {
      this.target = {
        x: hx + pdx * 3,
        y: hy + pdy * 3,
      }
      return
    }

    // Flee from bigger enemies whose HEAD is nearby (within 180px)
    // — don't flee bodies, only approaching heads are dangerous
    if (allEnemies) {
      for (const other of allEnemies) {
        if (other === this || other._isDead) continue
        const dx = hx - other.head.x, dy = hy - other.head.y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < 180 && other.body.length > myLen + 2) {
          // Run away from the bigger enemy's head
          this.target = { x: hx + dx * 3, y: hy + dy * 3 }
          return
        }
      }
    }

    // ── 2. Hunt smaller enemies — attack their body if we're bigger ───
    if (allEnemies) {
      let huntTarget = null, huntDist = Infinity
      for (const other of allEnemies) {
        if (other === this || other._isDead) continue
        if (other.body.length >= myLen - 2) continue  // only hunt clearly smaller
        const dx = hx - other.head.x, dy = hy - other.head.y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < 350 && d < huntDist) {
          huntDist   = d
          huntTarget = other.head  // aim for their head — if we hit their body we win
        }
      }
      if (huntTarget) {
        this.target = huntTarget
        return
      }
    }

    // ── 3. Seek nearest food within range ────────────────────────────
    let closest = null, minD = Infinity
    for (const food of foodGroup.getChildren()) {
      const dx = hx - food.x, dy = hy - food.y
      const d  = dx * dx + dy * dy
      if (d < minD) { minD = d; closest = food }
    }
    if (closest && minD < 500 * 500) {
      this.target = closest
      return
    }

    // ── 4. Wander ─────────────────────────────────────────────────────
    this.wanderAngle += Phaser.Math.FloatBetween(-0.05, 0.05)
    this.target = {
      x: hx + Math.cos(this.wanderAngle) * 200,
      y: hy + Math.sin(this.wanderAngle) * 200,
    }
  }

  _move() {
    if (!this.target) return
    const angleToTarget = Phaser.Math.Angle.Between(
      this.head.x, this.head.y, this.target.x, this.target.y
    )
    const next = Phaser.Math.Angle.RotateTo(
      this.direction.angle(), angleToTarget, this.turnSpeed * 0.02
    )
    this.direction.setTo(Math.cos(next), Math.sin(next))
    this.head.body.setVelocity(this.direction.x * this.speed, this.direction.y * this.speed)
    this.head.rotation = next
  }

  _updateLabel() {
    this.label.setPosition(this.head.x, this.head.y - HEAD_RADIUS - 16)
  }

  // ─── Grow ─────────────────────────────────────────────────────────────────

  grow() {
    this._addBodySegment()  // defined in SnakeBase
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    super.destroy()         // handles head, body segments, eyes
    this.label.destroy()
  }
}
