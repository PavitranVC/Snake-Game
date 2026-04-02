import Phaser from "phaser"
import { LEVELS, getUnlockedLevel } from "./LevelConfig"
import { getPlayerName, setPlayerName } from "./Leaderboard"

const W = 1280
const H = 720

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" })
  }

  create() {
    this._buildBackground()
    this._buildTitle()
    this._buildLevelCards()
    this._buildNameInput()
    this._buildTopBar()
    this._buildFooter()
    this._animateIn()
  }

  // ─── Background ───────────────────────────────────────────────────────────

  _buildBackground() {
    // Dark background
    this.add.rectangle(W / 2, H / 2, W, H, 0x050a0f)

    // Dot grid
    const gfx = this.add.graphics()
    for (let x = 40; x < W; x += 70) {
      for (let y = 40; y < H; y += 70) {
        gfx.fillStyle(0x0d3060, 0.6)
        gfx.fillCircle(x, y, 1.5)
      }
    }

    // Animated snake decoration — simple circles drifting
    this._snakeDots = []
    const colors = [0x39ff14, 0xff2d78, 0x00f0ff, 0xffe600]
    for (let i = 0; i < 12; i++) {
      const dot = this.add.graphics()
      const col = colors[i % colors.length]
      dot.fillStyle(col, 0.12); dot.fillCircle(0, 0, 22)
      dot.fillStyle(col, 0.3);  dot.fillCircle(0, 0, 14)
      dot.fillStyle(col, 0.8);  dot.fillCircle(0, 0, 7)
      dot.x = Phaser.Math.Between(50, W - 50)
      dot.y = Phaser.Math.Between(50, H - 50)
      dot._vx = Phaser.Math.FloatBetween(-0.4, 0.4)
      dot._vy = Phaser.Math.FloatBetween(-0.4, 0.4)
      this._snakeDots.push(dot)
    }

    // Top and bottom neon lines
    const lineGfx = this.add.graphics()
    lineGfx.lineStyle(2, 0x39ff14, 0.5)
    lineGfx.lineBetween(0, 0, W, 0)
    lineGfx.lineBetween(0, H - 1, W, H - 1)
  }

  // ─── Title ────────────────────────────────────────────────────────────────

  _buildTitle() {
    this.add.text(W / 2, 72, "NEON SNAKE", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "58px",
      fontStyle:  "bold",
      color:      "#39ff14",
      stroke:     "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setName("title")

    this.add.text(W / 2, 132, "SELECT YOUR LEVEL", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "14px",
      color:      "#7aaa88",
      stroke:     "#000",
      strokeThickness: 2,
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0).setName("subtitle")
  }

  // ─── Level cards ──────────────────────────────────────────────────────────

  _buildLevelCards() {
    const unlocked = getUnlockedLevel()
    const cardW = 330, cardH = 380
    const startX = W / 2 - cardW - 30
    const cardY  = H / 2 + 20

    this._cards = []

    LEVELS.forEach((lvl, i) => {
      const cx    = startX + i * (cardW + 30)
      const isLocked = lvl.id > unlocked
      const card  = this._makeCard(cx, cardY, cardW, cardH, lvl, isLocked, i)
      this._cards.push(card)
    })
  }

  _makeCard(cx, cy, cw, ch, lvl, isLocked, idx) {
    const container = this.add.container(cx, cy).setAlpha(0)
    const col = isLocked ? 0x333333 : lvl.colorHex
    const colStr = isLocked ? "#444444" : lvl.color

    // Card background
    const bg = this.add.graphics()
    bg.fillStyle(isLocked ? 0x0a0a0a : 0x061208, 1)
    bg.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12)
    bg.lineStyle(isLocked ? 1 : 2, col, isLocked ? 0.3 : 0.8)
    bg.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 12)
    container.add(bg)

    // Top accent bar
    const accent = this.add.graphics()
    accent.fillStyle(col, isLocked ? 0.2 : 1)
    accent.fillRect(-cw / 2, -ch / 2, cw, 5)
    container.add(accent)

    // Level number
    container.add(this.add.text(0, -ch / 2 + 32, `LEVEL ${lvl.id}`, {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "11px",
      color:      isLocked ? "#444" : colStr,
      letterSpacing: 4,
    }).setOrigin(0.5))

    // Level name
    container.add(this.add.text(0, -ch / 2 + 62, lvl.name, {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "22px",
      fontStyle:  "bold",
      color:      isLocked ? "#333" : "#ffffff",
    }).setOrigin(0.5))

    // Subtitle
    container.add(this.add.text(0, -ch / 2 + 92, `"${lvl.subtitle}"`, {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "10px",
      color:      isLocked ? "#333" : colStr,
      fontStyle:  "italic",
    }).setOrigin(0.5))

    // Divider
    const div = this.add.graphics()
    div.lineStyle(1, col, isLocked ? 0.15 : 0.4)
    div.lineBetween(-cw / 2 + 20, -ch / 2 + 112, cw / 2 - 20, -ch / 2 + 112)
    container.add(div)

    // Trait bullets
    lvl.traits.forEach((trait, ti) => {
      container.add(this.add.text(-cw / 2 + 24, -ch / 2 + 128 + ti * 30, `▸  ${trait}`, {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "10px",
        color:      isLocked ? "#333" : "#aaffaa",
      }))
    })

    // Kill target callout
    const killY = ch / 2 - 90
    container.add(this.add.text(0, killY, `${lvl.killTarget}`, {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "42px",
      fontStyle:  "bold",
      color:      isLocked ? "#333" : colStr,
    }).setOrigin(0.5))
    container.add(this.add.text(0, killY + 46, "KILLS TO WIN", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "9px",
      color:      isLocked ? "#333" : "#7aaa88",
      letterSpacing: 3,
    }).setOrigin(0.5))

    if (isLocked) {
      // Lock icon
      container.add(this.add.text(0, 10, "🔒", {
        fontSize: "36px",
      }).setOrigin(0.5).setAlpha(0.5))
      container.add(this.add.text(0, 56, "COMPLETE PREVIOUS\nLEVEL TO UNLOCK", {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "9px",
        color:      "#555",
        align:      "center",
        letterSpacing: 2,
      }).setOrigin(0.5))
    } else {
      // Play button
      const btnBg = this.add.graphics()
      btnBg.fillStyle(col, 0.15)
      btnBg.fillRoundedRect(-80, ch / 2 - 52, 160, 40, 8)
      btnBg.lineStyle(1.5, col, 0.9)
      btnBg.strokeRoundedRect(-80, ch / 2 - 52, 160, 40, 8)
      container.add(btnBg)

      const btnText = this.add.text(0, ch / 2 - 32, "▶  PLAY", {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "14px",
        fontStyle:  "bold",
        color:      colStr,
      }).setOrigin(0.5)
      container.add(btnText)

      // Hit area
      const hitZone = this.add.zone(0, ch / 2 - 32, 160, 40)
        .setInteractive({ useHandCursor: true })
      hitZone.on("pointerover", () => {
        btnBg.clear()
        btnBg.fillStyle(col, 0.4)
        btnBg.fillRoundedRect(-80, ch / 2 - 52, 160, 40, 8)
        btnBg.lineStyle(2, col, 1)
        btnBg.strokeRoundedRect(-80, ch / 2 - 52, 160, 40, 8)
        btnText.setStyle({ color: "#ffffff" })
      })
      hitZone.on("pointerout", () => {
        btnBg.clear()
        btnBg.fillStyle(col, 0.15)
        btnBg.fillRoundedRect(-80, ch / 2 - 52, 160, 40, 8)
        btnBg.lineStyle(1.5, col, 0.9)
        btnBg.strokeRoundedRect(-80, ch / 2 - 52, 160, 40, 8)
        btnText.setStyle({ color: colStr })
      })
      hitZone.on("pointerdown", () => this._startLevel(lvl.id))
      container.add(hitZone)
    }

    return container
  }

  // ─── Footer ───────────────────────────────────────────────────────────────

  _buildFooter() {
    this.add.text(W / 2, H - 24, "MOUSE to steer  ·  SPACE to boost  ·  ESC to pause", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "9px",
      color:      "#2a4a3a",
      letterSpacing: 2,
    }).setOrigin(0.5)
  }

  // ─── Animations ───────────────────────────────────────────────────────────

  _animateIn() {
    const title    = this.children.getByName("title")
    const subtitle = this.children.getByName("subtitle")

    this.tweens.add({ targets: title,    alpha: 1, duration: 600, delay: 100, ease: "Power2" })
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 600, delay: 300, ease: "Power2" })

    this._cards.forEach((card, i) => {
      this.tweens.add({
        targets: card,
        alpha:   1,
        y:       card.y,
        duration: 500,
        delay:    400 + i * 120,
        ease:     "Back.easeOut",
        from:     { y: card.y + 40 },
      })
    })
  }

  // ─── Name input ──────────────────────────────────────────────────────────

  _buildNameInput() {
    // HTML input element overlaid on the canvas for name entry
    // Removed when scene shuts down
    const existing = document.getElementById("neon_name_input")
    if (existing) existing.remove()

    const input = document.createElement("input")
    input.id          = "neon_name_input"
    input.maxLength   = 12
    input.placeholder = "YOUR NAME"
    input.value       = getPlayerName()
    input.style.cssText = [
      "position:fixed",
      "bottom:56px",
      "right:24px",
      "width:160px",
      "background:#050a0f",
      "border:1px solid #39ff1466",
      "border-radius:6px",
      "color:#39ff14",
      "font-family:'Orbitron',monospace",
      "font-size:12px",
      "padding:6px 10px",
      "outline:none",
      "text-align:center",
      "letter-spacing:2px",
      "text-transform:uppercase",
      "z-index:999",
    ].join(";")
    input.addEventListener("input", () => setPlayerName(input.value))
    input.addEventListener("focus", () => { input.style.borderColor = "#39ff14" })
    input.addEventListener("blur",  () => { input.style.borderColor = "#39ff1466" })
    document.body.appendChild(input)
    this._nameInput = input

    // Label above input
    this.add.text(W - 24, H - 76, "PLAYER NAME", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "8px",
      color:      "#7aaa88",
      letterSpacing: 3,
    }).setOrigin(1, 0)
  }

  // ─── Top bar — leaderboard button ─────────────────────────────────────────

  _buildTopBar() {
    const lbX = W - 24, lbY = 18
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.5)
    bg.fillRoundedRect(lbX - 172, lbY, 172, 28, 6)
    bg.lineStyle(1, 0x39ff14, 0.35)
    bg.strokeRoundedRect(lbX - 172, lbY, 172, 28, 6)

    const lbBtn = this.add.text(lbX - 86, lbY + 14, "🏆  LEADERBOARD", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "10px",
      color:      "#ffe600",
      stroke:     "#000",
      strokeThickness: 2,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    lbBtn.on("pointerover", () => lbBtn.setStyle({ color: "#ffffff" }))
    lbBtn.on("pointerout",  () => lbBtn.setStyle({ color: "#ffe600" }))
    lbBtn.on("pointerdown", () => {
      this._cleanupInput()
      this.cameras.main.fade(200, 0, 0, 0)
      this.time.delayedCall(200, () => {
        this.scene.start("LeaderboardScene")
        this.scene.stop("MenuScene")
      })
    })
  }

  _cleanupInput() {
    const el = document.getElementById("neon_name_input")
    if (el) el.remove()
  }

  // ─── Start level ──────────────────────────────────────────────────────────

  update() {
    // Drift the background dots
    for (const dot of this._snakeDots) {
      dot.x += dot._vx
      dot.y += dot._vy
      if (dot.x < 0 || dot.x > W) dot._vx *= -1
      if (dot.y < 0 || dot.y > H) dot._vy *= -1
    }
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  _startLevel(levelId) {
    this._cleanupInput()
    this.cameras.main.fade(300, 0, 0, 0)
    this.time.delayedCall(300, () => {
      this.scene.start("SnakeScene", { levelId })
      this.scene.start("UIScene",    { levelId })
      this.scene.stop("MenuScene")
    })
  }
}
