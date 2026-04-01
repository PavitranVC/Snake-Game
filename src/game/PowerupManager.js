import Phaser from "phaser"
import { POWERUP_TYPES, POWERUP_SPAWN_INTERVAL, POWERUP_LIFETIME, WORLD_SIZE, BORDER_MARGIN } from "./constants"

/**
 * PowerupManager — spawns, animates and tracks powerup pickups.
 *
 * Each powerup is a plain Image with a physics body. One shared tween
 * pulses all of them (same pattern as FoodManager). A Phaser timer
 * handles periodic spawning. When collected, the effect is applied
 * directly to the Snake instance via snake.applyPowerup(type).
 */
export default class PowerupManager {
  constructor(scene, snake) {
    this.scene  = scene
    this.snake  = snake
    this.group  = scene.physics.add.group()
    this._pulse = { scale: 1.0 }

    this._buildTextures()
    this._buildPulseTween()
    this._startSpawnTimer()

    // Overlap with player head
    scene.physics.add.overlap(
      snake.head,
      this.group,
      (head, powerup) => this._collect(powerup)
    )
  }

  // ─── Textures — one per powerup type, baked once ──────────────────────────

  _buildTextures() {
    for (const pt of POWERUP_TYPES) {
      const key = `powerup_${pt.id}`
      if (this.scene.textures.exists(key)) continue

      const r    = pt.radius
      const size = r * 7
      const cx   = size / 2, cy = size / 2
      const g    = this.scene.add.graphics({ x: -99999, y: -99999 })

      // Outer pulse ring
      g.fillStyle(pt.color, 0.08); g.fillCircle(cx, cy, r * 3)
      g.fillStyle(pt.color, 0.2);  g.fillCircle(cx, cy, r * 2.2)
      g.fillStyle(pt.color, 0.5);  g.fillCircle(cx, cy, r * 1.5)
      g.fillStyle(pt.color, 1);    g.fillCircle(cx, cy, r)
      // Star / diamond shape on top
      g.fillStyle(0xffffff, 0.9)
      g.fillRect(cx - 2, cy - r * 0.7, 4, r * 1.4)
      g.fillRect(cx - r * 0.7, cy - 2, r * 1.4, 4)
      g.generateTexture(key, size, size)
      g.destroy()
    }
  }

  // ─── Shared pulse tween ───────────────────────────────────────────────────

  _buildPulseTween() {
    this.scene.tweens.add({
      targets:  this._pulse,
      scale:    1.35,
      duration: 500,
      yoyo:     true,
      repeat:   -1,
      ease:     "Sine.easeInOut",
      onUpdate: () => {
        for (const p of this.group.getChildren()) p.setScale(this._pulse.scale)
      },
    })
  }

  // ─── Spawn timer ──────────────────────────────────────────────────────────

  _startSpawnTimer() {
    this.scene.time.addEvent({
      delay:    POWERUP_SPAWN_INTERVAL,
      loop:     true,
      callback: () => this._spawnRandom(),
    })
    // Spawn one immediately so the world doesn't feel empty at start
    this.scene.time.delayedCall(2000, () => this._spawnRandom())
  }

  _spawnRandom() {
    // Max 3 powerups at once — don't litter the world
    if (this.group.getLength() >= 3) return

    const type = Phaser.Math.RND.pick(POWERUP_TYPES)
    const x    = Phaser.Math.Between(BORDER_MARGIN, WORLD_SIZE - BORDER_MARGIN)
    const y    = Phaser.Math.Between(BORDER_MARGIN, WORLD_SIZE - BORDER_MARGIN)

    const key  = `powerup_${type.id}`
    const p    = this.scene.add.image(x, y, key).setDepth(7)
    p.powerupId = type.id

    this.scene.physics.add.existing(p)
    const r      = type.radius
    const size   = r * 7
    const hitR   = r * 1.5
    const offset = size / 2 - hitR
    p.body.setCircle(hitR, offset, offset)

    this.group.add(p)

    // Auto-despawn after POWERUP_LIFETIME
    this.scene.time.delayedCall(POWERUP_LIFETIME, () => {
      if (p.active) {
        // Fade out before destroy
        this.scene.tweens.add({
          targets: p, alpha: 0, duration: 400,
          onComplete: () => { if (p.active) { this.group.remove(p, true, true) } }
        })
      }
    })
  }

  // ─── Collection ───────────────────────────────────────────────────────────

  _collect(powerup) {
    if (!powerup.active) return
    const type = POWERUP_TYPES.find(t => t.id === powerup.powerupId)
    if (!type) return

    this.snake.applyPowerup(powerup.powerupId)

    // Flash + destroy
    this.scene.cameras.main.flash(120, 255, 255, 100)
    this.group.remove(powerup, true, true)

    // Notify UI
    this.scene.events.emit("powerupCollected", type)
  }
}
