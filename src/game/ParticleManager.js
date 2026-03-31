import Phaser from "phaser"

/**
 * ParticleManager — handles all particle effects.
 *
 * Memory fix: instead of creating + destroying a new emitter object on every
 * eat/kill/death event, we keep a small pool of reusable emitters that are
 * stopped and repositioned rather than allocated/freed. This eliminates the
 * GC pressure that caused performance hitches after many kills.
 */
export default class ParticleManager {
  constructor(scene) {
    this.scene = scene
    this._buildTextures()
    this._buildPools()
  }

  _buildTextures() {
    if (!scene.textures.exists("particle_soft")) {
      const g = scene.add.graphics()
      g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 6)
      g.generateTexture("particle_soft", 12, 12); g.destroy()
    }
    if (!scene.textures.exists("particle_spark")) {
      const g = scene.add.graphics()
      g.fillStyle(0xffffff, 1); g.fillRect(0, 2, 10, 2)
      g.generateTexture("particle_spark", 10, 6); g.destroy()
    }
  }

  _buildTextures() {
    const scene = this.scene
    if (!scene.textures.exists("particle_soft")) {
      const g = scene.add.graphics()
      g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 6)
      g.generateTexture("particle_soft", 12, 12); g.destroy()
    }
    if (!scene.textures.exists("particle_spark")) {
      const g = scene.add.graphics()
      g.fillStyle(0xffffff, 1); g.fillRect(0, 2, 10, 2)
      g.generateTexture("particle_spark", 10, 6); g.destroy()
    }
  }

  // Pre-allocate a fixed pool of emitters at startup.
  // Each emitter stays alive for the whole scene lifetime — we just reuse them.
  _buildPools() {
    const scene = this.scene

    // Eat burst pool — one per concurrent eat (unlikely to need more than 3)
    this._eatPool = Array.from({ length: 3 }, () =>
      scene.add.particles(0, 0, "particle_soft", {
        speed:    { min: 60, max: 180 },
        scale:    { start: 0.5, end: 0 },
        alpha:    { start: 1, end: 0 },
        lifespan: { min: 200, max: 400 },
        quantity: 8,
        depth:    20,
        emitting: false,
      })
    )
    this._eatIdx = 0

    // Kill explosion pool — soft + spark paired
    this._killSoftPool = Array.from({ length: 4 }, () =>
      scene.add.particles(0, 0, "particle_soft", {
        speed:    { min: 80, max: 300 },
        scale:    { start: 1.2, end: 0 },
        alpha:    { start: 1, end: 0 },
        lifespan: { min: 400, max: 800 },
        quantity: 30,
        depth:    20,
        emitting: false,
      })
    )
    this._killSparkPool = Array.from({ length: 4 }, () =>
      scene.add.particles(0, 0, "particle_spark", {
        speed:    { min: 100, max: 350 },
        scale:    { start: 0.8, end: 0 },
        alpha:    { start: 1, end: 0 },
        lifespan: { min: 300, max: 600 },
        angle:    { min: 0, max: 360 },
        quantity: 15,
        depth:    20,
        emitting: false,
      })
    )
    this._killIdx = 0

    // Death emitter — only one needed (player can only die once at a time)
    this._deathEmitter = scene.add.particles(0, 0, "particle_soft", {
      speed:    { min: 100, max: 400 },
      scale:    { start: 1.5, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: { min: 500, max: 1000 },
      quantity: 50,
      depth:    30,
      emitting: false,
    })
  }

  // ─── Effects ──────────────────────────────────────────────────────────────

  eatBurst(x, y, color) {
    // Round-robin through the eat pool
    const emitter = this._eatPool[this._eatIdx % this._eatPool.length]
    this._eatIdx++
    emitter.setPosition(x, y)
    emitter.setParticleTint(color)
    emitter.explode(8)
  }

  killExplosion(x, y, color, shake = false) {
    const i    = this._killIdx % this._killSoftPool.length
    this._killIdx++
    const soft  = this._killSoftPool[i]
    const spark = this._killSparkPool[i]
    soft.setPosition(x, y);   soft.setParticleTint(color);  soft.explode(30)
    spark.setPosition(x, y);  spark.setParticleTint(color); spark.explode(15)
    // Only shake the camera when the PLAYER made the kill
    if (shake) this.scene.cameras.main.shake(200, 0.012)
  }

  deathEffect(x, y) {
    this._deathEmitter.setPosition(x, y)
    this._deathEmitter.setParticleTint(0x39ff14)
    this._deathEmitter.explode(50)
    this.scene.cameras.main.shake(350, 0.025)
    this.scene.cameras.main.flash(200, 255, 50, 50)
  }
}
