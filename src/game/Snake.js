import Phaser from "phaser"
import {
  PLAYER_COLOR, BASE_SPEED, BOOST_SPEED,
  BOOST_DRAIN, BOOST_REGEN, BOOST_MAX,
  SEGMENT_SPACING, HEAD_RADIUS, BODY_RADIUS
} from "./constants"

export default class Snake {
  constructor(scene, x, y) {
    this.scene = scene
    this.color = PLAYER_COLOR
    this.history = []
    this.spacing = SEGMENT_SPACING
    this.direction = new Phaser.Math.Vector2(1, 0)
    this.baseSpeed = BASE_SPEED
    this.boostSpeed = BOOST_SPEED
    this.isBoosting = false
    this.boostEnergy = BOOST_MAX
    this.score = 0
    this.kills = 0

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys()
    this.wasd = scene.input.keyboard.addKeys({ up:"W", down:"S", left:"A", right:"D" })
    this.boostKey = scene.input.keyboard.addKey("SPACE")

    // Build head
    this.head = this._makeSegment(x, y, HEAD_RADIUS, this.color, true)
    scene.physics.add.existing(this.head)
    this.head.body.setCircle(HEAD_RADIUS)
    this.head.body.setOffset(-HEAD_RADIUS, -HEAD_RADIUS)
    this.head.body.setCollideWorldBounds(true)

    // Eyes as simple dot images — no per-frame redraw
    this._buildEyeTexture()
    this.eyeL = scene.add.image(0, 0, 'eye_dot').setDepth(12)
    this.eyeR = scene.add.image(0, 0, 'eye_dot').setDepth(12)

    // Body segments
    this.body = []
    for (let i = 0; i < 6; i++) this.grow(true)

    // Boost trail emitter
    this._buildTrailEmitter()
  }

  _makeSegment(x, y, r, color, isHead = false) {
    const g = this.scene.add.graphics()
    g.x = x
    g.y = y
    // Outer glow ring
    g.fillStyle(color, 0.18)
    g.fillCircle(0, 0, r * 2.2)
    // Mid glow
    g.fillStyle(color, 0.35)
    g.fillCircle(0, 0, r * 1.5)
    // Core
    g.fillStyle(color, 1)
    g.fillCircle(0, 0, r)
    // Specular highlight
    g.fillStyle(0xffffff, isHead ? 0.6 : 0.3)
    g.fillCircle(-r * 0.28, -r * 0.28, r * 0.3)
    g.setDepth(isHead ? 11 : 10)
    return g
  }

  _buildTrailEmitter() {
    // Programmatic particle using graphics texture
    const gfx = this.scene.add.graphics()
    gfx.fillStyle(0x39ff14, 1)
    gfx.fillCircle(4, 4, 4)
    gfx.generateTexture("trail_particle", 8, 8)
    gfx.destroy()

    this.trailEmitter = this.scene.add.particles(0, 0, "trail_particle", {
      speed: { min: 10, max: 40 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 300,
      tint: [0x39ff14, 0x00ff88],
      emitting: false,
      depth: 9,
    })
  }

  update() {
    this._handleInput()
    this._moveHead()
    this._updateHistory()
    this._updateBody()
    this._updateEyes()
    this._updateBoost()
  }

  _handleInput() {
    const pointer = this.scene.input.activePointer

    // --- Mouse steering (primary, slither.io style) ---
    // Use Phaser's built-in unproject — handles zoom, scroll, everything correctly
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const dx = world.x - this.head.x
    const dy = world.y - this.head.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Only steer toward mouse; dead zone prevents jitter when cursor is on head
    if (dist > 40) {
      const targetAngle = Math.atan2(dy, dx)
      const currentAngle = this.direction.angle()
      const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, 0.09)
      this.direction.setTo(Math.cos(newAngle), Math.sin(newAngle))
    }

    // --- Keyboard-only steering (ignored when mouse moves the snake) ---
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown
    if (left)  this.direction.rotate(-0.08)
    if (right) this.direction.rotate( 0.08)

    // --- Boost: SPACE or right mouse button ---
    const rmb = pointer.rightButtonDown ? pointer.rightButtonDown() : false
    this.isBoosting = (this.boostKey.isDown || rmb) && this.boostEnergy > 0
  }

  _moveHead() {
    const speed = this.isBoosting ? this.boostSpeed : this.baseSpeed
    this.head.body.setVelocity(
      this.direction.x * speed,
      this.direction.y * speed
    )
    this.head.rotation = this.direction.angle()
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

  _buildEyeTexture() {
    if (this.scene.textures.exists('eye_dot')) return
    const g = this.scene.add.graphics()
    g.fillStyle(0xffffff, 1)
    g.fillCircle(5, 5, 5)
    g.fillStyle(0x000000, 1)
    g.fillCircle(6.5, 5, 2.5)
    g.generateTexture('eye_dot', 10, 10)
    g.destroy()
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

  _updateBoost() {
    if (this.isBoosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - BOOST_DRAIN)
      this.trailEmitter.setPosition(this.head.x, this.head.y)
      this.trailEmitter.emitting = true
      this.trailEmitter.explode(2)
    } else {
      this.boostEnergy = Math.min(BOOST_MAX, this.boostEnergy + BOOST_REGEN)
      this.trailEmitter.emitting = false
    }
  }

  grow(silent = false) {
    const last = this.body.length > 0
      ? this.body[this.body.length - 1]
      : this.head
    const seg = this._makeSegment(last.x, last.y, BODY_RADIUS, this.color)
    this.body.push(seg)
    if (!silent) {
      this.score += 10
      this.scene.events.emit("scoreChanged", this.score, this.body.length + 1)
    }
  }

  getBodyParts() { return this.body }

  destroy() {
    this.head.destroy()
    this.body.forEach(s => s.destroy())
    this.eyeL.destroy()
    this.eyeR.destroy()
    this.trailEmitter.destroy()
  }
}
