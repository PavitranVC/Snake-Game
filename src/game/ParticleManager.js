import Phaser from "phaser"

export default class ParticleManager {
  constructor(scene) {
    this.scene = scene
    this._buildTextures()
  }

  _buildTextures() {
    if (!this.scene.textures.exists("particle_soft")) {
      const g = this.scene.add.graphics()
      g.fillStyle(0xffffff, 1)
      g.fillCircle(6, 6, 6)
      g.generateTexture("particle_soft", 12, 12)
      g.destroy()
    }
    if (!this.scene.textures.exists("particle_spark")) {
      const g = this.scene.add.graphics()
      g.fillStyle(0xffffff, 1)
      g.fillRect(0, 2, 10, 2)
      g.generateTexture("particle_spark", 10, 6)
      g.destroy()
    }
  }

  eatBurst(x, y, color) {
    const emitter = this.scene.add.particles(x, y, "particle_soft", {
      speed: { min: 60, max: 180 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 200, max: 400 },
      quantity: 8,
      tint: [color, 0xffffff],
      depth: 20,
    })
    this.scene.time.delayedCall(500, () => emitter.destroy())
  }

  killExplosion(x, y, color) {
    const emitter = this.scene.add.particles(x, y, "particle_soft", {
      speed: { min: 80, max: 300 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 400, max: 800 },
      quantity: 30,
      tint: [color, 0xffffff, 0xffff00],
      depth: 20,
    })
    const sparks = this.scene.add.particles(x, y, "particle_spark", {
      speed: { min: 100, max: 350 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 300, max: 600 },
      angle: { min: 0, max: 360 },
      quantity: 15,
      tint: [color, 0xffffff],
      depth: 20,
    })
    this.scene.time.delayedCall(1000, () => {
      emitter.destroy()
      sparks.destroy()
    })
    this.scene.cameras.main.shake(200, 0.012)
  }

  deathEffect(x, y) {
    const emitter = this.scene.add.particles(x, y, "particle_soft", {
      speed: { min: 100, max: 400 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 500, max: 1000 },
      quantity: 50,
      tint: [0x39ff14, 0xffffff, 0x00ff88],
      depth: 30,
    })
    this.scene.cameras.main.shake(350, 0.025)
    this.scene.cameras.main.flash(200, 255, 50, 50)
    this.scene.time.delayedCall(1200, () => emitter.destroy())
  }
}
