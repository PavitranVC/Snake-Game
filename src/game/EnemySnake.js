import Phaser from "phaser"
import SnakeBase from "./SnakeBase"
import { ENEMY_COLORS, HEAD_RADIUS } from "./constants"

export default class EnemySnake extends SnakeBase {
  constructor(scene, x, y, colorIndex, cfg = {}) {
    const palette = ENEMY_COLORS[colorIndex % ENEMY_COLORS.length]
    super(scene, x, y, palette.hex, palette.hex)

    this.colorHex  = palette.hex
    this.snakeName = palette.name + " #" + (colorIndex + 1)

    // Speed from level config
    const speedMin = cfg.enemySpeedMin ?? 110
    const speedMax = cfg.enemySpeedMax ?? 160
    this.speed     = Phaser.Math.Between(speedMin, speedMax)
    this.turnSpeed = Phaser.Math.FloatBetween(1.8, 3.2)

    // AI config from level
    this.aggression           = cfg.aggression           ?? 0
    this.fleeRange            = cfg.fleeRange            ?? 250
    this.huntRange            = cfg.huntRange            ?? 200
    this.targetPlayerDirectly = cfg.targetPlayerDirectly ?? false

    this.direction = new Phaser.Math.Vector2(
      Phaser.Math.FloatBetween(-1, 1),
      Phaser.Math.FloatBetween(-1, 1)
    ).normalize()

    this.target       = null
    this.wanderAngle  = Phaser.Math.FloatBetween(0, Math.PI * 2)
    this._targetTimer = Math.floor(Math.random() * 20)

    for (let i = 0; i < 6; i++) this._addBodySegment()

    this.label = scene.add.text(x, y - HEAD_RADIUS - 16, palette.name, {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "10px",
      color:      palette.glow,
      stroke:     "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(13)
  }

  update(foodGroup, player, allEnemies) {
    this._findTarget(foodGroup, player, allEnemies)
    this._move()
    this._updateHistory()
    this._updateBody()
    this._updateEyes()
    this._updateLabel()
  }

  _findTarget(foodGroup, player, allEnemies) {
    this._targetTimer++
    // Level 3 (aggression=2): scan every 8 frames — much more reactive
    const scanRate = this.aggression === 2 ? 8 : this.aggression === 1 ? 14 : 20
    if (this._targetTimer < scanRate) return
    this._targetTimer = 0

    const hx = this.head.x, hy = this.head.y
    const myLen = this.body.length

    // ── Level 3 special: always target player if in range ────────────
    if (this.targetPlayerDirectly) {
      const pdx = hx - player.x, pdy = hy - player.y
      const pd  = Math.sqrt(pdx * pdx + pdy * pdy)
      if (pd < this.huntRange) {
        // Aim to intercept player — target slightly ahead of their position
        this.target = { x: player.x, y: player.y }
        return
      }
    }

    // ── 1. Flee from player if within flee range ──────────────────────
    if (this.fleeRange > 0) {
      const pdx = hx - player.x, pdy = hy - player.y
      const pd  = Math.sqrt(pdx * pdx + pdy * pdy)
      if (pd < this.fleeRange) {
        this.target = { x: hx + pdx * 3, y: hy + pdy * 3 }
        return
      }
    }

    // ── 2. Flee from bigger enemies (only levels 0 and 1) ────────────
    if (this.aggression < 2 && allEnemies) {
      for (const other of allEnemies) {
        if (other === this || other._isDead) continue
        const dx = hx - other.head.x, dy = hy - other.head.y
        const d  = Math.sqrt(dx * dx + dy * dy)
        const fleeEnemyRange = this.aggression === 0 ? 180 : 120
        if (d < fleeEnemyRange && other.body.length > myLen + 2) {
          this.target = { x: hx + dx * 3, y: hy + dy * 3 }
          return
        }
      }
    }

    // ── 3. Hunt smaller enemies ───────────────────────────────────────
    if (allEnemies) {
      // Level 3: hunt ANY enemy (even same size), not just smaller
      const sizeThreshold = this.aggression === 2 ? myLen + 999 : myLen - 2
      let huntTarget = null, huntDist = Infinity
      for (const other of allEnemies) {
        if (other === this || other._isDead) continue
        if (other.body.length >= sizeThreshold) continue
        const dx = hx - other.head.x, dy = hy - other.head.y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < this.huntRange && d < huntDist) {
          huntDist   = d
          huntTarget = other.head
        }
      }
      if (huntTarget) { this.target = huntTarget; return }
    }

    // ── 4. Seek food ──────────────────────────────────────────────────
    let closest = null, minD = Infinity
    for (const food of foodGroup.getChildren()) {
      const dx = hx - food.x, dy = hy - food.y
      const d  = dx * dx + dy * dy
      if (d < minD) { minD = d; closest = food }
    }
    if (closest && minD < 500 * 500) { this.target = closest; return }

    // ── 5. Wander ─────────────────────────────────────────────────────
    // Level 3: wander more erratically
    const wobble = this.aggression === 2 ? 0.12 : 0.05
    this.wanderAngle += Phaser.Math.FloatBetween(-wobble, wobble)
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

  grow() { this._addBodySegment() }

  destroy() {
    super.destroy()
    this.label.destroy()
  }
}
