import Phaser from "phaser"
import { LEVELS, unlockLevel, getLevelConfig } from "./LevelConfig.js"

const W = 1280, H = 720

export default class LevelCompleteScene extends Phaser.Scene {
  constructor() { super({ key: "LevelCompleteScene" }) }

  init(data) {
    this.levelId = data.levelId || 1
    this.score   = data.score   || 0
    this.kills   = data.kills   || 0
    this.length  = data.length  || 1
  }

  create() {
    const cfg    = getLevelConfig(this.levelId)
    const isLast = this.levelId === LEVELS.length
    const nextCfg = !isLast ? getLevelConfig(this.levelId + 1) : null
    if (!isLast) unlockLevel(this.levelId + 1)

    this.add.rectangle(W/2, H/2, W, H, 0x050a0f)
    const gfx = this.add.graphics()
    for (let x = 40; x < W; x += 70)
      for (let y = 40; y < H; y += 70) { gfx.fillStyle(0x0d3060, 0.5); gfx.fillCircle(x, y, 1.5) }

    this.add.text(W/2, 130, "LEVEL COMPLETE!", {
      fontFamily: "'Orbitron', monospace", fontSize: "52px", fontStyle: "bold",
      color: cfg.color, stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setName("t")

    this.add.text(W/2, 196, cfg.name, {
      fontFamily: "'Orbitron', monospace", fontSize: "16px", color: "#7aaa88", letterSpacing: 5,
    }).setOrigin(0.5).setAlpha(0).setName("n")

    const stats = [["KILLS", this.kills], ["SCORE", this.score], ["LENGTH", this.length]]
    stats.forEach(([label, val], i) => {
      const sx = W/2 - 200 + i * 200
      const card = this.add.graphics().setAlpha(0).setName(`c${i}`)
      card.fillStyle(0x061208, 1); card.fillRoundedRect(sx-75, 250, 150, 100, 10)
      card.lineStyle(1.5, cfg.colorHex, 0.6); card.strokeRoundedRect(sx-75, 250, 150, 100, 10)
      this.add.text(sx, 283, String(val), { fontFamily: "'Orbitron', monospace", fontSize: "32px", fontStyle: "bold", color: cfg.color }).setOrigin(0.5).setAlpha(0).setName(`v${i}`)
      this.add.text(sx, 325, label, { fontFamily: "'Orbitron', monospace", fontSize: "9px", color: "#7aaa88", letterSpacing: 3 }).setOrigin(0.5).setAlpha(0).setName(`l${i}`)
    })

    this.add.text(W/2, 395, isLast ? "🏆  YOU CONQUERED ALL LEVELS!" : `🔓  UNLOCKED: ${nextCfg.name}`, {
      fontFamily: "'Orbitron', monospace", fontSize: isLast ? "18px" : "15px", fontStyle: isLast ? "bold" : "normal",
      color: isLast ? "#ffe600" : nextCfg.color, stroke: "#000", strokeThickness: isLast ? 4 : 3,
    }).setOrigin(0.5).setAlpha(0).setName("u")

    this._makeBtn(W/2-130, 490, "↩  RETRY LEVEL", cfg.color, cfg.colorHex, () => {
      this.cameras.main.fade(250, 0, 0, 0)
      this.time.delayedCall(250, () => {
        this.scene.stop("LevelCompleteScene")
        this.game.events.emit("startPlanetLevel", this.levelId)
      })
    })

    if (!isLast) {
      this._makeBtn(W/2+130, 490, `▶  LEVEL ${this.levelId+1}`, nextCfg.color, nextCfg.colorHex, () => {
        this.cameras.main.fade(250, 0, 0, 0)
        this.time.delayedCall(250, () => {
          this.scene.stop("LevelCompleteScene")
          this.game.events.emit("startPlanetLevel", this.levelId + 1)
        })
      })
    }

    this._makeBtn(W/2, 570, "⌂  MAIN MENU", "#7aaa88", 0x7aaa88, () => {
      this.cameras.main.fade(250, 0, 0, 0)
      this.time.delayedCall(250, () => { this.scene.stop("UIScene"); this.scene.start("MenuScene"); this.scene.stop("LevelCompleteScene") })
    })

    const names = ["t","n","u","c0","c1","c2","v0","v1","v2","l0","l1","l2"]
    names.forEach((nm, i) => {
      const obj = this.children.getByName(nm)
      if (obj) this.tweens.add({ targets: obj, alpha: 1, duration: 400, delay: 200 + i * 80 })
    })
  }

  _makeBtn(x, y, label, color, colorHex, onClick) {
    const bg  = this.add.graphics()
    bg.fillStyle(colorHex, 0.12); bg.fillRoundedRect(x-110, y-20, 220, 40, 8)
    bg.lineStyle(1.5, colorHex, 0.8); bg.strokeRoundedRect(x-110, y-20, 220, 40, 8)
    const txt = this.add.text(x, y, label, { fontFamily: "'Orbitron', monospace", fontSize: "12px", fontStyle: "bold", color }).setOrigin(0.5)
    const zone = this.add.zone(x, y, 220, 40).setInteractive({ useHandCursor: true })
    zone.on("pointerover", () => { bg.clear(); bg.fillStyle(colorHex, 0.3); bg.fillRoundedRect(x-110, y-20, 220, 40, 8); bg.lineStyle(2, colorHex, 1); bg.strokeRoundedRect(x-110, y-20, 220, 40, 8); txt.setStyle({ color: "#fff" }) })
    zone.on("pointerout",  () => { bg.clear(); bg.fillStyle(colorHex, 0.12); bg.fillRoundedRect(x-110, y-20, 220, 40, 8); bg.lineStyle(1.5, colorHex, 0.8); bg.strokeRoundedRect(x-110, y-20, 220, 40, 8); txt.setStyle({ color }) })
    zone.on("pointerdown", onClick)
  }
}
