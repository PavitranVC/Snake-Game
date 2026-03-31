import Phaser from "phaser"
import SnakeBase from "./SnakeBase"
import {
  PLAYER_COLOR,
  BASE_SPEED, BOOST_SPEED,
  BOOST_DRAIN, BOOST_REGEN, BOOST_MAX, BOOST_COOLDOWN_MS,
} from "./constants"

export default class Snake extends SnakeBase {
  constructor(scene, x, y) {
    super(scene, x, y, PLAYER_COLOR, PLAYER_COLOR)

    this.baseSpeed   = BASE_SPEED
    this.boostSpeed  = BOOST_SPEED
    this.isBoosting  = false
    this.boostEnergy = BOOST_MAX
    this.boostMax    = BOOST_MAX       // can be increased by powerup

    // Cooldown: ms remaining before regen is allowed after tank empties
    this._boostCooldownMs  = 0
    this._boostOnCooldown  = false

    // Powerup multipliers (reset on death / scene restart)
    this.regenMultiplier   = 1.0       // boost_regen powerup increases this
    this._regenPowerupTimer = 0
    this._capPowerupTimer   = 0

    // Input
    this.cursors  = scene.input.keyboard.createCursorKeys()
    this.wasd     = scene.input.keyboard.addKeys({ up: "W", down: "S", left: "A", right: "D" })
    this.boostKey = scene.input.keyboard.addKey("SPACE")

    for (let i = 0; i < 6; i++) this._addBodySegment()
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

  update(delta) {
    this._handleInput()
    this._moveHead()
    this._updateHistory()
    this._updateBody()
    this._updateEyes()
    this._updateBoost(delta)
    this._tickPowerups(delta)
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _handleInput() {
    const pointer = this.scene.input.activePointer
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const dx = world.x - this.head.x
    const dy = world.y - this.head.y

    if (Math.sqrt(dx * dx + dy * dy) > 40) {
      const newAngle = Phaser.Math.Angle.RotateTo(
        this.direction.angle(), Math.atan2(dy, dx), 0.09
      )
      this.direction.setTo(Math.cos(newAngle), Math.sin(newAngle))
    }

    if (this.cursors.left.isDown  || this.wasd.left.isDown)  this.direction.rotate(-0.08)
    if (this.cursors.right.isDown || this.wasd.right.isDown) this.direction.rotate( 0.08)

    const rmb = pointer.rightButtonDown ? pointer.rightButtonDown() : false
    // Can't boost while on cooldown
    this.isBoosting = (this.boostKey.isDown || rmb) && this.boostEnergy > 0 && !this._boostOnCooldown
  }

  _moveHead() {
    const speed = this.isBoosting ? this.boostSpeed : this.baseSpeed
    this.head.body.setVelocity(this.direction.x * speed, this.direction.y * speed)
    this.head.rotation = this.direction.angle()
  }

  // ─── Boost with cooldown ──────────────────────────────────────────────────

  _updateBoost(delta) {
    if (this.isBoosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - BOOST_DRAIN)
      this.trailEmitter.setPosition(this.head.x, this.head.y)
      this.trailEmitter.explode(2)

      // Tank just hit empty — start cooldown
      if (this.boostEnergy === 0 && !this._boostOnCooldown) {
        this._boostOnCooldown = true
        this._boostCooldownMs = BOOST_COOLDOWN_MS
      }
    } else {
      // Count down cooldown
      if (this._boostOnCooldown) {
        this._boostCooldownMs -= delta
        if (this._boostCooldownMs <= 0) {
          this._boostOnCooldown = false
          this._boostCooldownMs = 0
        }
      } else {
        // Normal regen — only when not on cooldown
        const regen = BOOST_REGEN * this.regenMultiplier
        this.boostEnergy = Math.min(this.boostMax, this.boostEnergy + regen)
      }
    }
  }

  // ─── Powerup effects ──────────────────────────────────────────────────────

  applyPowerup(type) {
    if (type === "boost_refill") {
      // Instant full refill, clears cooldown
      this.boostEnergy      = this.boostMax
      this._boostOnCooldown = false
      this._boostCooldownMs = 0
    } else if (type === "boost_regen") {
      // 3× regen speed for 10 seconds
      this.regenMultiplier   = 3.0
      this._regenPowerupTimer = 10000
    } else if (type === "boost_capacity") {
      // +50 max capacity for 15 seconds
      this.boostMax          = BOOST_MAX + 50
      this._capPowerupTimer  = 15000
      this.boostEnergy       = Math.min(this.boostEnergy + 50, this.boostMax)
    }
  }

  _tickPowerups(delta) {
    if (this._regenPowerupTimer > 0) {
      this._regenPowerupTimer -= delta
      if (this._regenPowerupTimer <= 0) this.regenMultiplier = 1.0
    }
    if (this._capPowerupTimer > 0) {
      this._capPowerupTimer -= delta
      if (this._capPowerupTimer <= 0) {
        this.boostMax    = BOOST_MAX
        this.boostEnergy = Math.min(this.boostEnergy, this.boostMax)
      }
    }
  }

  // Expose powerup state for UI
  get activePowerup() {
    if (this._regenPowerupTimer > 0) return { id: "boost_regen",    msLeft: this._regenPowerupTimer }
    if (this._capPowerupTimer  > 0) return { id: "boost_capacity", msLeft: this._capPowerupTimer  }
    return null
  }

  // ─── Grow ─────────────────────────────────────────────────────────────────

  grow() { this._addBodySegment() }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    super.destroy()
    this.trailEmitter.destroy()
  }
}
