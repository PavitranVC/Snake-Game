import Phaser from "phaser"
import SnakeBase from "./SnakeBase"
import {
  PLAYER_COLOR,
  BASE_SPEED, BOOST_SPEED,
  BOOST_DRAIN, BOOST_REGEN, BOOST_MAX,
} from "./constants"

export default class Snake extends SnakeBase {
  constructor(scene, x, y) {
    super(scene, x, y, PLAYER_COLOR, PLAYER_COLOR)

    this.baseSpeed   = BASE_SPEED
    this.boostSpeed  = BOOST_SPEED
    this.isBoosting  = false
    this.boostEnergy = BOOST_MAX

    // Input
    this.cursors  = scene.input.keyboard.createCursorKeys()
    this.wasd     = scene.input.keyboard.addKeys({ up: "W", down: "S", left: "A", right: "D" })
    this.boostKey = scene.input.keyboard.addKey("SPACE")

    // Start with 6 body segments
    for (let i = 0; i < 6; i++) this._addBodySegment()

    // Boost trail — single particle emitter, reused every frame
    this._buildTrailEmitter()
  }

  // ─── Trail emitter ────────────────────────────────────────────────────────

  _buildTrailEmitter() {
    if (!this.scene.textures.exists("trail_particle")) {
      const g = this.scene.add.graphics()
      g.fillStyle(0xffffff, 1)
      g.fillCircle(4, 4, 4)
      g.generateTexture("trail_particle", 8, 8)
      g.destroy()
    }
    this.trailEmitter = this.scene.add.particles(0, 0, "trail_particle", {
      speed:    { min: 10, max: 40 },
      scale:    { start: 0.8, end: 0 },
      alpha:    { start: 0.6, end: 0 },
      lifespan: 300,
      tint:     [PLAYER_COLOR, 0x00ff88],
      emitting: false,
      depth:    9,
    })
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  update() {
    this._handleInput()
    this._moveHead()
    this._updateHistory()   // inherited from SnakeBase
    this._updateBody()      // inherited from SnakeBase
    this._updateEyes()      // inherited from SnakeBase
    this._updateBoost()
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _handleInput() {
    const pointer = this.scene.input.activePointer

    // Mouse steering — getWorldPoint correctly unprojects screen coords
    // through camera zoom + scroll, which plain math gets wrong
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const dx = world.x - this.head.x
    const dy = world.y - this.head.y

    if (Math.sqrt(dx * dx + dy * dy) > 40) {
      const newAngle = Phaser.Math.Angle.RotateTo(
        this.direction.angle(),
        Math.atan2(dy, dx),
        0.09                  // max radians per frame — prevents instant snapping
      )
      this.direction.setTo(Math.cos(newAngle), Math.sin(newAngle))
    }

    // Keyboard — additive, works alongside mouse
    if (this.cursors.left.isDown  || this.wasd.left.isDown)  this.direction.rotate(-0.08)
    if (this.cursors.right.isDown || this.wasd.right.isDown) this.direction.rotate( 0.08)

    // Boost trigger — SPACE or right mouse button
    const rmb = pointer.rightButtonDown ? pointer.rightButtonDown() : false
    this.isBoosting = (this.boostKey.isDown || rmb) && this.boostEnergy > 0
  }

  _moveHead() {
    const speed = this.isBoosting ? this.boostSpeed : this.baseSpeed
    this.head.body.setVelocity(this.direction.x * speed, this.direction.y * speed)
    this.head.rotation = this.direction.angle()
  }

  // ─── Boost ────────────────────────────────────────────────────────────────

  _updateBoost() {
    if (this.isBoosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - BOOST_DRAIN)
      this.trailEmitter.setPosition(this.head.x, this.head.y)
      this.trailEmitter.explode(2)
    } else {
      this.boostEnergy = Math.min(BOOST_MAX, this.boostEnergy + BOOST_REGEN)
    }
  }

  // ─── Grow ─────────────────────────────────────────────────────────────────

  grow() {
    this._addBodySegment()  // defined in SnakeBase
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    super.destroy()         // handles head, body segments, eyes
    this.trailEmitter.destroy()
  }
}
