import Phaser from "phaser"
import { getLeaderboard, clearLeaderboard } from "./Leaderboard"
import { LEVELS } from "./LevelConfig"

const W = 1280
const H = 720

const LEVEL_COLORS = {
  1: "#39ff14",
  2: "#ffe600",
  3: "#ff2d78",
}

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: "LeaderboardScene" })
  }

  create() {
    this._buildBackground()
    this._buildTitle()
    this._buildTable()
    this._buildButtons()
    this._animateIn()
  }

  _buildBackground() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x050a0f)
    const gfx = this.add.graphics()
    for (let x = 40; x < W; x += 70) {
      for (let y = 40; y < H; y += 70) {
        gfx.fillStyle(0x0d3060, 0.5)
        gfx.fillCircle(x, y, 1.5)
      }
    }
    // Side accent lines
    gfx.lineStyle(1, 0x39ff14, 0.2)
    gfx.lineBetween(0, 0, W, 0)
    gfx.lineBetween(0, H - 1, W, H - 1)
  }

  _buildTitle() {
    this.add.text(W / 2, 44, "LEADERBOARD", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "42px",
      fontStyle:  "bold",
      color:      "#39ff14",
      stroke:     "#000",
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setName("lb_title")

    this.add.text(W / 2, 100, "TOP SCORES ACROSS ALL LEVELS", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "11px",
      color:      "#7aaa88",
      letterSpacing: 5,
    }).setOrigin(0.5).setAlpha(0).setName("lb_sub")
  }

  _buildTable() {
    const entries = getLeaderboard()
    const tableX  = W / 2 - 500
    const tableW  = 1000
    const startY  = 128
    const rowH    = 44

    // Header row
    const headerGfx = this.add.graphics().setAlpha(0).setName("lb_header_bg")
    headerGfx.fillStyle(0x061208, 1)
    headerGfx.fillRoundedRect(tableX, startY, tableW, 32, 6)
    headerGfx.lineStyle(1, 0x39ff14, 0.4)
    headerGfx.strokeRoundedRect(tableX, startY, tableW, 32, 6)

    const hStyle = {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "9px",
      color:      "#7aaa88",
      letterSpacing: 2,
    }
    ;[
      [tableX + 24,        "#"],
      [tableX + 70,        "PLAYER"],
      [tableX + 280,       "SCORE"],
      [tableX + 440,       "KILLS"],
      [tableX + 580,       "LENGTH"],
      [tableX + 700,       "LEVEL"],
      [tableX + tableW - 20, "DATE"],
    ].forEach(([x, label]) => {
      this.add.text(x, startY + 10, label, hStyle)
        .setAlpha(0).setName("lb_header_bg")
        .setOrigin(label === "DATE" ? 1 : 0, 0)
    })

    if (entries.length === 0) {
      this.add.text(W / 2, startY + 120, "No scores yet — play a level to get on the board!", {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "14px",
        color:      "#2a4a3a",
      }).setOrigin(0.5).setAlpha(0).setName("lb_empty")
      return
    }

    entries.forEach((entry, i) => {
      const ry       = startY + 36 + i * rowH
      const isTop3   = i < 3
      const rowColor = i === 0 ? 0xffe600 : i === 1 ? 0xaaaaaa : i === 2 ? 0xff7c2a : 0x39ff14
      const rowStr   = i === 0 ? "#ffe600" : i === 1 ? "#aaaaaa" : i === 2 ? "#ff7c2a" : "#39ff14"
      const levelCol = LEVEL_COLORS[entry.levelId] || "#39ff14"
      const alpha    = Math.max(0.4, 1 - i * 0.06)

      // Row background
      const rowBg = this.add.graphics().setAlpha(0).setName(`lb_row_${i}`)
      rowBg.fillStyle(isTop3 ? 0x0a1a0a : 0x060c06, 1)
      rowBg.fillRoundedRect(tableX, ry, tableW, rowH - 4, 6)
      if (isTop3) {
        rowBg.lineStyle(1, rowColor, 0.4)
        rowBg.strokeRoundedRect(tableX, ry, tableW, rowH - 4, 6)
      }

      const ts = {
        fontFamily: "'Orbitron', monospace",
        fontSize:   isTop3 ? "13px" : "11px",
        color:      "#ffffff",
        stroke:     "#000",
        strokeThickness: 2,
      }

      // Rank
      this.add.text(tableX + 24, ry + rowH / 2 - 10, `${i + 1}`, {
        ...ts, color: rowStr, fontSize: isTop3 ? "16px" : "13px", fontStyle: "bold"
      }).setAlpha(0).setName(`lb_row_${i}`)

      // Crown for top 3
      if (i === 0) {
        this.add.text(tableX + 46, ry + 4, "👑", { fontSize: "12px" })
          .setAlpha(0).setName(`lb_row_${i}`)
      }

      // Name
      this.add.text(tableX + 70, ry + rowH / 2 - 10, entry.name || "ANONYMOUS", {
        ...ts, color: isTop3 ? "#ffffff" : "#ccffcc", fontStyle: isTop3 ? "bold" : "normal"
      }).setAlpha(0).setName(`lb_row_${i}`)

      // Score
      this.add.text(tableX + 280, ry + rowH / 2 - 10, String(entry.score || 0), {
        ...ts, color: rowStr
      }).setAlpha(0).setName(`lb_row_${i}`)

      // Kills
      this.add.text(tableX + 440, ry + rowH / 2 - 10, String(entry.kills || 0), {
        ...ts, color: "#ff4488"
      }).setAlpha(0).setName(`lb_row_${i}`)

      // Length
      this.add.text(tableX + 580, ry + rowH / 2 - 10, String(entry.length || 1), {
        ...ts, color: "#aaffaa"
      }).setAlpha(0).setName(`lb_row_${i}`)

      // Level badge
      const lvlName = LEVELS.find(l => l.id === entry.levelId)?.name || `L${entry.levelId}`
      this.add.text(tableX + 700, ry + rowH / 2 - 10, `L${entry.levelId}  ${lvlName}`, {
        ...ts, color: levelCol, fontSize: "9px"
      }).setAlpha(0).setName(`lb_row_${i}`)

      // Date
      this.add.text(tableX + tableW - 20, ry + rowH / 2 - 10, entry.date || "", {
        ...ts, color: "#444", fontSize: "9px"
      }).setOrigin(1, 0).setAlpha(0).setName(`lb_row_${i}`)
    })
  }

  _buildButtons() {
    this._makeBtn(W / 2 - 130, H - 52, "◀  BACK TO MENU", "#39ff14", 0x39ff14, () => {
      this.cameras.main.fade(200, 0, 0, 0)
      this.time.delayedCall(200, () => {
        this.scene.start("MenuScene")
        this.scene.stop("LeaderboardScene")
      })
    })

    this._makeBtn(W / 2 + 130, H - 52, "🗑  CLEAR SCORES", "#ff4444", 0xff4444, () => {
      clearLeaderboard()
      this.scene.restart()
    })
  }

  _makeBtn(x, y, label, color, colorHex, onClick) {
    const bg = this.add.graphics()
    bg.fillStyle(colorHex, 0.1)
    bg.fillRoundedRect(x - 120, y - 18, 240, 36, 7)
    bg.lineStyle(1.5, colorHex, 0.7)
    bg.strokeRoundedRect(x - 120, y - 18, 240, 36, 7)

    const txt = this.add.text(x, y, label, {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "11px",
      fontStyle:  "bold",
      color,
    }).setOrigin(0.5)

    const zone = this.add.zone(x, y, 240, 36).setInteractive({ useHandCursor: true })
    zone.on("pointerover", () => {
      bg.clear()
      bg.fillStyle(colorHex, 0.3); bg.fillRoundedRect(x - 120, y - 18, 240, 36, 7)
      bg.lineStyle(2, colorHex, 1); bg.strokeRoundedRect(x - 120, y - 18, 240, 36, 7)
      txt.setStyle({ color: "#ffffff" })
    })
    zone.on("pointerout", () => {
      bg.clear()
      bg.fillStyle(colorHex, 0.1); bg.fillRoundedRect(x - 120, y - 18, 240, 36, 7)
      bg.lineStyle(1.5, colorHex, 0.7); bg.strokeRoundedRect(x - 120, y - 18, 240, 36, 7)
      txt.setStyle({ color })
    })
    zone.on("pointerdown", onClick)
  }

  _animateIn() {
    // Stagger all named elements in
    const groups = [
      ["lb_title", "lb_sub", "lb_header_bg", "lb_empty"],
      ...Array.from({ length: 10 }, (_, i) => [`lb_row_${i}`]),
    ]
    groups.forEach((names, gi) => {
      names.forEach(name => {
        this.children.list
          .filter(c => c.name === name)
          .forEach(obj => {
            this.tweens.add({ targets: obj, alpha: obj._originalAlpha ?? 1, duration: 300, delay: gi * 50 })
          })
      })
    })
  }
}
