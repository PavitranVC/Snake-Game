import Phaser from "phaser"
import { ENEMY_COLORS, HEAD_RADIUS, BODY_RADIUS, SEGMENT_SPACING } from "./constants"

export default class EnemySnake {
  constructor(scene, x, y, colorIndex) {
    this.scene = scene
    const palette = ENEMY_COLORS[colorIndex % ENEMY_COLORS.length]
    this.colorHex  = palette.hex
    this.colorGlow = palette.glow
    this.snakeName = palette.name + " #" + (colorIndex + 1)
    this.length    = 6

    this.speed      = Phaser.Math.Between(110, 160)
    this.turnSpeed  = Phaser.Math.FloatBetween(1.8, 3.2)
    this.direction  = new Phaser.Math.Vector2(
      Phaser.Math.FloatBetween(-1, 1),
      Phaser.Math.FloatBetween(-1, 1)
    ).normalize()
    this.history = []
    this.spacing = SEGMENT_SPACING
    this.target      = null
    this.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2)
    this._targetTimer = Math.floor(Math.random() * 20)

    this.head = this._makeSeg(x, y, HEAD_RADIUS, true)
    scene.physics.add.existing(this.head)
    this.head.body.setCircle(HEAD_RADIUS)
    this.head.body.setOffset(-HEAD_RADIUS, -HEAD_RADIUS)
    this.head.body.setCollideWorldBounds(true)

    this.body = []
    for (let i = 0; i < this.length; i++) this._addSegment()

    const eyeKey = 'eye_dot'
    // Reuse texture built by Snake; fallback build if Snake hasn't run yet
    if (!scene.textures.exists(eyeKey)) {
      const g = scene.add.graphics()
      g.fillStyle(0xffffff, 1); g.fillCircle(5, 5, 5)
      g.fillStyle(0x000000, 1); g.fillCircle(6.5, 5, 2.5)
      g.generateTexture(eyeKey, 10, 10); g.destroy()
    }
    this.eyeL = scene.add.image(0, 0, eyeKey).setDepth(12)
    this.eyeR = scene.add.image(0, 0, eyeKey).setDepth(12)

    // Name label
    this.label = scene.add.text(x, y - HEAD_RADIUS - 16, palette.name, {
      fontFamily: "'Orbitron', monospace",
      fontSize: "10px",
      color: palette.glow,
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(13)
  }

  _makeSeg(x, y, r, isHead = false) {
    const g = this.scene.add.graphics()
    g.x = x; g.y = y
    g.fillStyle(this.colorHex, 0.15)
    g.fillCircle(0, 0, r * 2.2)
    g.fillStyle(this.colorHex, 0.3)
    g.fillCircle(0, 0, r * 1.5)
    g.fillStyle(this.colorHex, 1)
    g.fillCircle(0, 0, r)
    g.fillStyle(0xffffff, isHead ? 0.5 : 0.2)
    g.fillCircle(-r * 0.28, -r * 0.28, r * 0.28)
    g.setDepth(isHead ? 11 : 10)
    return g
  }

  _addSegment() {
    const ref = this.body.length > 0 ? this.body[this.body.length - 1] : this.head
    const seg = this._makeSeg(ref.x, ref.y, BODY_RADIUS)
    this.body.push(seg)
  }

  update(foodGroup, player) {
    this._findTarget(foodGroup, player)
    this._move()
    this._updateHistory()
    this._updateBody()
    this._updateEyes()
    this._updateLabel()
  }

  _findTarget(foodGroup, player) {
    // Only scan for new food target every 20 frames — big CPU saving
    this._targetTimer++
    if (this._targetTimer < 20) return
    this._targetTimer = 0

    // Flee from player if close
    const pd = Phaser.Math.Distance.Between(
      this.head.x, this.head.y, player.x, player.y
    )
    if (pd < 220) {
      this.target = {
        x: this.head.x + (this.head.x - player.x) * 3,
        y: this.head.y + (this.head.y - player.y) * 3,
      }
      return
    }

    // Seek nearest food
    let closest = null, minD = Infinity
    foodGroup.getChildren().forEach(food => {
      const d = Phaser.Math.Distance.Between(
        this.head.x, this.head.y, food.x, food.y
      )
      if (d < minD) { minD = d; closest = food }
    })

    if (closest && minD < 500) {
      this.target = closest
    } else {
      // Wander
      this.wanderAngle += Phaser.Math.FloatBetween(-0.05, 0.05)
      this.target = {
        x: this.head.x + Math.cos(this.wanderAngle) * 200,
        y: this.head.y + Math.sin(this.wanderAngle) * 200,
      }
    }
  }

  _move() {
    if (!this.target) return
    const angleToTarget = Phaser.Math.Angle.Between(
      this.head.x, this.head.y, this.target.x, this.target.y
    )
    const cur = this.direction.angle()
    const next = Phaser.Math.Angle.RotateTo(cur, angleToTarget, this.turnSpeed * 0.02)
    this.direction.setTo(Math.cos(next), Math.sin(next))
    this.head.body.setVelocity(
      this.direction.x * this.speed,
      this.direction.y * this.speed
    )
    this.head.rotation = next
  }

  _updateHistory() {
    this.history.unshift({ x: this.head.x, y: this.head.y })
    if (this.history.length > 1000) this.history.length = 1000
  }

  _updateBody() {
    for (let i = 0; i < this.body.length; i++) {
      const idx = Math.floor((i + 1) * this.spacing)
      const pt = this.history[idx]
      if (!pt) continue
      this.body[i].x = pt.x
      this.body[i].y = pt.y
    }
  }

  _updateEyes() {
    const angle = this.direction.angle()
    const spread = 0.45
    const dist = HEAD_RADIUS * 0.6
    this.eyeL.setPosition(
      this.head.x + Math.cos(angle - spread) * dist,
      this.head.y + Math.sin(angle - spread) * dist
    )
    this.eyeR.setPosition(
      this.head.x + Math.cos(angle + spread) * dist,
      this.head.y + Math.sin(angle + spread) * dist
    )
  }

  _updateLabel() {
    this.label.setPosition(this.head.x, this.head.y - HEAD_RADIUS - 16)
  }

  grow() {
    this._addSegment()
  }

  getBodyParts() { return this.body }

  destroy() {
    this.head.destroy()
    this.body.forEach(s => s.destroy())
    this.eyeL.destroy()
    this.eyeR.destroy()
    this.label.destroy()
  }
}
