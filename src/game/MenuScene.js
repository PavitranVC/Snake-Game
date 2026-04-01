import Phaser from "phaser"
import { LEVELS, getUnlockedLevel } from "./LevelConfig.js"

const W = 1280, H = 720

export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "MenuScene" }) }

  create() {
    this._buildBackground()
    this._buildTitle()
    this._buildLevelCards()
    this._buildFooter()
    this._animateIn()
  }

  _buildBackground() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x050a0f)
    const gfx = this.add.graphics()
    for (let x = 40; x < W; x += 70)
      for (let y = 40; y < H; y += 70) { gfx.fillStyle(0x0d3060, 0.6); gfx.fillCircle(x, y, 1.5) }

    this._dots = []
    const colors = [0x39ff14, 0xff2d78, 0x00f0ff, 0xffe600]
    for (let i = 0; i < 12; i++) {
      const d = this.add.graphics()
      const c = colors[i % colors.length]
      d.fillStyle(c, 0.12); d.fillCircle(0, 0, 22)
      d.fillStyle(c, 0.3);  d.fillCircle(0, 0, 14)
      d.fillStyle(c, 0.8);  d.fillCircle(0, 0, 7)
      d.x = Phaser.Math.Between(50, W - 50)
      d.y = Phaser.Math.Between(50, H - 50)
      d._vx = Phaser.Math.FloatBetween(-0.4, 0.4)
      d._vy = Phaser.Math.FloatBetween(-0.4, 0.4)
      this._dots.push(d)
    }
    const lg = this.add.graphics()
    lg.lineStyle(2, 0x39ff14, 0.5)
    lg.lineBetween(0, 0, W, 0)
    lg.lineBetween(0, H - 1, W, H - 1)
  }

  _buildTitle() {
    this.add.text(W / 2, 72, "NEON SNAKE 3D", {
      fontFamily: "'Orbitron', monospace", fontSize: "52px", fontStyle: "bold",
      color: "#39ff14", stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setName("title")
    this.add.text(W / 2, 132, "SELECT YOUR LEVEL", {
      fontFamily: "'Orbitron', monospace", fontSize: "14px",
      color: "#7aaa88", stroke: "#000", strokeThickness: 2, letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0).setName("subtitle")
  }

  _buildLevelCards() {
    const unlocked = getUnlockedLevel()
    const cW = 330, cH = 380
    const startX = W / 2 - cW - 30
    this._cards = []
    LEVELS.forEach((lvl, i) => {
      this._cards.push(this._makeCard(startX + i * (cW + 30), H / 2 + 20, cW, cH, lvl, lvl.id > unlocked))
    })
  }

  _makeCard(cx, cy, cw, ch, lvl, locked) {
    const cont   = this.add.container(cx, cy).setAlpha(0)
    const col    = locked ? 0x333333 : lvl.colorHex
    const colStr = locked ? "#444444" : lvl.color

    const bg = this.add.graphics()
    bg.fillStyle(locked ? 0x0a0a0a : 0x061208, 1)
    bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12)
    bg.lineStyle(locked ? 1 : 2, col, locked ? 0.3 : 0.8)
    bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 12)
    cont.add(bg)

    const acc = this.add.graphics()
    acc.fillStyle(col, locked ? 0.2 : 1); acc.fillRect(-cw / 2, -ch / 2, cw, 5)
    cont.add(acc)

    const tf = { fontFamily: "'Orbitron', monospace" }
    cont.add(this.add.text(0, -ch/2+32, `LEVEL ${lvl.id}`, { ...tf, fontSize: "11px", color: locked ? "#444" : colStr, letterSpacing: 4 }).setOrigin(0.5))
    cont.add(this.add.text(0, -ch/2+62, lvl.name,           { ...tf, fontSize: "22px", fontStyle: "bold", color: locked ? "#333" : "#fff" }).setOrigin(0.5))
    cont.add(this.add.text(0, -ch/2+92, `"${lvl.subtitle}"`,{ ...tf, fontSize: "10px", fontStyle: "italic", color: locked ? "#333" : colStr }).setOrigin(0.5))

    const div = this.add.graphics()
    div.lineStyle(1, col, locked ? 0.15 : 0.4)
    div.lineBetween(-cw/2+20, -ch/2+112, cw/2-20, -ch/2+112)
    cont.add(div)

    lvl.traits.forEach((t, ti) => cont.add(this.add.text(-cw/2+24, -ch/2+128+ti*30, `▸  ${t}`, { ...tf, fontSize: "10px", color: locked ? "#333" : "#aaffaa" })))

    const ky = ch/2 - 90
    cont.add(this.add.text(0, ky,    String(lvl.killTarget), { ...tf, fontSize: "42px", fontStyle: "bold", color: locked ? "#333" : colStr }).setOrigin(0.5))
    cont.add(this.add.text(0, ky+46, "KILLS TO WIN",         { ...tf, fontSize: "9px", color: locked ? "#333" : "#7aaa88", letterSpacing: 3 }).setOrigin(0.5))

    if (locked) {
      cont.add(this.add.text(0, 10,  "🔒", { fontSize: "36px" }).setOrigin(0.5).setAlpha(0.5))
      cont.add(this.add.text(0, 56, "COMPLETE PREVIOUS\nLEVEL TO UNLOCK", { ...tf, fontSize: "9px", color: "#555", align: "center", letterSpacing: 2 }).setOrigin(0.5))
    } else {
      const btnBg = this.add.graphics()
      btnBg.fillStyle(col, 0.15); btnBg.fillRoundedRect(-80, ch/2-52, 160, 40, 8)
      btnBg.lineStyle(1.5, col, 0.9); btnBg.strokeRoundedRect(-80, ch/2-52, 160, 40, 8)
      cont.add(btnBg)

      const btnTxt = this.add.text(0, ch/2-32, "▶  PLAY", { ...tf, fontSize: "14px", fontStyle: "bold", color: colStr }).setOrigin(0.5)
      cont.add(btnTxt)

      const zone = this.add.zone(0, ch/2-32, 160, 40).setInteractive({ useHandCursor: true })
      zone.on("pointerover", () => {
        btnBg.clear(); btnBg.fillStyle(col, 0.4); btnBg.fillRoundedRect(-80, ch/2-52, 160, 40, 8)
        btnBg.lineStyle(2, col, 1); btnBg.strokeRoundedRect(-80, ch/2-52, 160, 40, 8)
        btnTxt.setStyle({ color: "#ffffff" })
      })
      zone.on("pointerout", () => {
        btnBg.clear(); btnBg.fillStyle(col, 0.15); btnBg.fillRoundedRect(-80, ch/2-52, 160, 40, 8)
        btnBg.lineStyle(1.5, col, 0.9); btnBg.strokeRoundedRect(-80, ch/2-52, 160, 40, 8)
        btnTxt.setStyle({ color: colStr })
      })
      zone.on("pointerdown", () => this._startLevel(lvl.id))
      cont.add(zone)
    }
    return cont
  }

  _buildFooter() {
    this.add.text(W/2, H-24, "MOUSE to steer  ·  SPACE to boost  ·  ESC to pause", {
      fontFamily: "'Orbitron', monospace", fontSize: "9px", color: "#2a4a3a", letterSpacing: 2,
    }).setOrigin(0.5)
  }

  _animateIn() {
    this.tweens.add({ targets: this.children.getByName("title"),    alpha: 1, duration: 600, delay: 100, ease: "Power2" })
    this.tweens.add({ targets: this.children.getByName("subtitle"), alpha: 1, duration: 600, delay: 300, ease: "Power2" })
    this._cards.forEach((c, i) => this.tweens.add({ targets: c, alpha: 1, duration: 500, delay: 400 + i * 120, ease: "Back.easeOut" }))
  }

  update() {
    for (const d of this._dots) {
      d.x += d._vx; d.y += d._vy
      if (d.x < 0 || d.x > W) d._vx *= -1
      if (d.y < 0 || d.y > H) d._vy *= -1
    }
  }

  _startLevel(levelId) {
    this.cameras.main.fade(300, 0, 0, 0)
    this.time.delayedCall(300, () => {
      this.game.events.emit("startPlanetLevel", levelId)
      this.scene.stop("MenuScene")
    })
  }
}
