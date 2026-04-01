import Phaser from "phaser"
import { LEVELS, unlockLevel, getLevelConfig } from "./LevelConfig"

const W = 1280
const H = 720

export default class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super({ key: "LevelCompleteScene" })
  }

  init(data) {
    this.levelId   = data.levelId   || 1
    this.score     = data.score     || 0
    this.kills     = data.kills     || 0
    this.length    = data.length    || 1
  }

  create() {
    const cfg     = getLevelConfig(this.levelId)
    const isLast  = this.levelId === LEVELS.length
    const nextCfg = !isLast ? getLevelConfig(this.levelId + 1) : null

    // Unlock the next level in localStorage
    if (!isLast) unlockLevel(this.levelId + 1)

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x050a0f)
    const gfx = this.add.graphics()
    for (let x = 40; x < W; x += 70) {
      for (let y = 40; y < H; y += 70) {
        gfx.fillStyle(0x0d3060, 0.5); gfx.fillCircle(x, y, 1.5)
      }
    }

    // Particles burst
    if (!this.textures.exists("complete_particle")) {
      const pg = this.add.graphics({ x: -99999, y: -99999 })
      pg.fillStyle(0xffffff, 1); pg.fillCircle(5, 5, 5)
      pg.generateTexture("complete_particle", 10, 10); pg.destroy()
    }
    const burst = this.add.particles(W / 2, H / 2 - 60, "complete_particle", {
      speed: { min: 100, max: 400 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 400, max: 900 },
      quantity: 60,
      tint: [cfg.colorHex, 0xffffff, 0x39ff14],
      depth: 20,
    })
    this.time.delayedCall(1000, () => burst.destroy())

    // Title
    this.add.text(W / 2, 130, "LEVEL COMPLETE!", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "52px",
      fontStyle:  "bold",
      color:      cfg.color,
      stroke:     "#000",
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setName("complete_title")

    this.add.text(W / 2, 196, cfg.name, {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "16px",
      color:      "#7aaa88",
      letterSpacing: 5,
    }).setOrigin(0.5).setAlpha(0).setName("level_name")

    // Stats row
    const stats = [
      ["KILLS", this.kills],
      ["SCORE", this.score],
      ["LENGTH", this.length],
    ]
    stats.forEach(([label, val], i) => {
      const sx = W / 2 - 200 + i * 200
      const card = this.add.graphics().setAlpha(0).setName(`stat_${i}`)
      card.fillStyle(0x061208, 1)
      card.fillRoundedRect(sx - 75, 250, 150, 100, 10)
      card.lineStyle(1.5, cfg.colorHex, 0.6)
      card.strokeRoundedRect(sx - 75, 250, 150, 100, 10)
      this.add.text(sx, 283, String(val), {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "32px",
        fontStyle:  "bold",
        color:      cfg.color,
      }).setOrigin(0.5).setAlpha(0).setName(`statval_${i}`)
      this.add.text(sx, 325, label, {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "9px",
        color:      "#7aaa88",
        letterSpacing: 3,
      }).setOrigin(0.5).setAlpha(0).setName(`statlbl_${i}`)
    })

    // Next level unlock banner or "all done"
    if (!isLast) {
      this.add.text(W / 2, 395, `🔓  UNLOCKED: ${nextCfg.name}`, {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "15px",
        color:      nextCfg.color,
        stroke:     "#000",
        strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0).setName("unlock_text")
    } else {
      this.add.text(W / 2, 395, "🏆  YOU CONQUERED ALL LEVELS!", {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "18px",
        fontStyle:  "bold",
        color:      "#ffe600",
        stroke:     "#000",
        strokeThickness: 4,
      }).setOrigin(0.5).setAlpha(0).setName("unlock_text")
    }

    // Buttons
    this._makeBtn(W / 2 - 130, 490, "↩  RETRY LEVEL", cfg.color, cfg.colorHex, () => {
      this.cameras.main.fade(250, 0, 0, 0)
      this.time.delayedCall(250, () => {
        this.scene.start("SnakeScene", { levelId: this.levelId })
        this.scene.start("UIScene",    { levelId: this.levelId })
        this.scene.stop("LevelCompleteScene")
      })
    })

    if (!isLast) {
      this._makeBtn(W / 2 + 130, 490, `▶  LEVEL ${this.levelId + 1}`, nextCfg.color, nextCfg.colorHex, () => {
        this.cameras.main.fade(250, 0, 0, 0)
        this.time.delayedCall(250, () => {
          this.scene.start("SnakeScene", { levelId: this.levelId + 1 })
          this.scene.start("UIScene",    { levelId: this.levelId + 1 })
          this.scene.stop("LevelCompleteScene")
        })
      })
    }

    this._makeBtn(W / 2, 570, "⌂  MAIN MENU", "#7aaa88", 0x7aaa88, () => {
      this.cameras.main.fade(250, 0, 0, 0)
      this.time.delayedCall(250, () => {
        this.scene.stop("UIScene")
        this.scene.start("MenuScene")
        this.scene.stop("LevelCompleteScene")
      })
    })

    this._animateIn()
  }

  _makeBtn(x, y, label, color, colorHex, onClick) {
    const bg = this.add.graphics()
    bg.fillStyle(colorHex, 0.12)
    bg.fillRoundedRect(x - 110, y - 20, 220, 40, 8)
    bg.lineStyle(1.5, colorHex, 0.8)
    bg.strokeRoundedRect(x - 110, y - 20, 220, 40, 8)

    const txt = this.add.text(x, y, label, {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "12px",
      fontStyle:  "bold",
      color,
    }).setOrigin(0.5)

    const zone = this.add.zone(x, y, 220, 40).setInteractive({ useHandCursor: true })
    zone.on("pointerover", () => {
      bg.clear()
      bg.fillStyle(colorHex, 0.3); bg.fillRoundedRect(x - 110, y - 20, 220, 40, 8)
      bg.lineStyle(2, colorHex, 1); bg.strokeRoundedRect(x - 110, y - 20, 220, 40, 8)
      txt.setStyle({ color: "#ffffff" })
    })
    zone.on("pointerout", () => {
      bg.clear()
      bg.fillStyle(colorHex, 0.12); bg.fillRoundedRect(x - 110, y - 20, 220, 40, 8)
      bg.lineStyle(1.5, colorHex, 0.8); bg.strokeRoundedRect(x - 110, y - 20, 220, 40, 8)
      txt.setStyle({ color })
    })
    zone.on("pointerdown", onClick)
  }

  _animateIn() {
    const names = [
      "complete_title", "level_name", "unlock_text",
      "stat_0", "stat_1", "stat_2",
      "statval_0", "statval_1", "statval_2",
      "statlbl_0", "statlbl_1", "statlbl_2",
    ]
    names.forEach((name, i) => {
      const obj = this.children.getByName(name)
      if (obj) this.tweens.add({ targets: obj, alpha: 1, duration: 400, delay: 200 + i * 80 })
    })
  }
}
