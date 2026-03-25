import Phaser from "phaser"
import { BOOST_MAX, WORLD_SIZE, PLAYER_COLOR, ENEMY_COLORS } from "./constants"

const W = 1280
const H = 720

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene" })
  }

  create() {
    this.stats = { score: 0, length: 1, kills: 0, boost: BOOST_MAX }

    // Load Orbitron via WebFont if not already present
    const style = document.createElement("style")
    style.textContent = `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');`
    document.head.appendChild(style)

    this._buildScorePanel()
    this._buildBoostBar()
    this._buildMinimap()
    this._buildKillFeed()
    this._buildPauseButton()
    this._buildPauseScreen()
    this._buildDeathScreen()

    // Listen for player death from SnakeScene
    const gameScene = this.scene.get("SnakeScene")
    if (gameScene) {
      gameScene.events.on("playerDied", data => this._showDeathScreen(data))
    }

    // ESC key toggles pause
    this.input.keyboard.on("keydown-ESC", () => this._togglePause())
  }

  // Called every frame from SnakeScene._syncUI
  setStats(s) {
    this.stats = s
    this._updateScorePanel()
    this._updateBoostBar()
    this._updateMinimap()
  }

  // ─── Score Panel ──────────────────────────────────────────────────────────
  _buildScorePanel() {
    const panelX = 20, panelY = 20
    // Background card
    this.scoreBg = this.add.graphics()
    this.scoreBg.fillStyle(0x000000, 0.55)
    this.scoreBg.fillRoundedRect(panelX, panelY, 220, 100, 10)
    this.scoreBg.lineStyle(1.5, 0x39ff14, 0.5)
    this.scoreBg.strokeRoundedRect(panelX, panelY, 220, 100, 10)

    const tf = {
      fontFamily: "'Orbitron', monospace",
      color: "#39ff14",
      stroke: "#000",
      strokeThickness: 3,
    }

    this.scoreLabel = this.add.text(panelX + 14, panelY + 10, "SCORE", {
      ...tf, fontSize: "10px", color: "#44ff88", alpha: 0.7
    })
    this.scoreValue = this.add.text(panelX + 14, panelY + 24, "0", {
      ...tf, fontSize: "28px", fontStyle: "bold"
    })
    this.lengthLabel = this.add.text(panelX + 14, panelY + 60, "LENGTH", {
      ...tf, fontSize: "10px", color: "#44ff88", alpha: 0.7
    })
    this.lengthValue = this.add.text(panelX + 14, panelY + 73, "1", {
      ...tf, fontSize: "18px"
    })
    this.killsLabel = this.add.text(panelX + 130, panelY + 60, "KILLS", {
      ...tf, fontSize: "10px", color: "#ff4488", alpha: 0.7
    })
    this.killsValue = this.add.text(panelX + 130, panelY + 73, "0", {
      ...tf, fontSize: "18px", color: "#ff4488"
    })
  }

  _updateScorePanel() {
    this.scoreValue.setText(String(this.stats.score))
    this.lengthValue.setText(String(this.stats.length))
    this.killsValue.setText(String(this.stats.kills))
  }

  // ─── Boost Bar ────────────────────────────────────────────────────────────
  _buildBoostBar() {
    const bx = W / 2 - 100
    const by = H - 36
    const bw = 200
    const bh = 14

    this.boostBg = this.add.graphics()
    this.boostBg.fillStyle(0x000000, 0.6)
    this.boostBg.fillRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, 7)
    this.boostBg.lineStyle(1, 0x39ff14, 0.3)
    this.boostBg.strokeRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, 7)

    this.boostFill = this.add.graphics()
    this.boostLabel = this.add.text(W / 2, by - 18, "BOOST  [SPACE]", {
      fontFamily: "'Orbitron', monospace",
      fontSize: "9px",
      color: "#39ff14",
      stroke: "#000",
      strokeThickness: 2,
      alpha: 0.8,
    }).setOrigin(0.5, 0)

    this._boostBarX = bx
    this._boostBarY = by
    this._boostBarW = bw
    this._boostBarH = bh
  }

  _updateBoostBar() {
    const pct = Math.max(0, Math.min(1, this.stats.boost / BOOST_MAX))
    const bx = this._boostBarX
    const by = this._boostBarY
    const bw = this._boostBarW
    const bh = this._boostBarH

    this.boostFill.clear()
    if (pct > 0) {
      const color = pct > 0.3 ? 0x39ff14 : 0xff4400
      this.boostFill.fillStyle(color, 0.9)
      this.boostFill.fillRoundedRect(bx, by, bw * pct, bh, 6)
      // Glow on full
      if (pct > 0.95) {
        this.boostFill.fillStyle(0x39ff14, 0.2)
        this.boostFill.fillRoundedRect(bx, by, bw, bh, 6)
      }
    }
  }

  // ─── Minimap ──────────────────────────────────────────────────────────────
  _buildMinimap() {
    const mx = W - 150, my = 20, mw = 130, mh = 130
    this._mm = { x: mx, y: my, w: mw, h: mh }

    this.minimapBg = this.add.graphics()
    this.minimapBg.fillStyle(0x000000, 0.65)
    this.minimapBg.fillRoundedRect(mx - 2, my - 2, mw + 4, mh + 4, 8)
    this.minimapBg.lineStyle(1.5, 0x39ff14, 0.4)
    this.minimapBg.strokeRoundedRect(mx - 2, my - 2, mw + 4, mh + 4, 8)

    this.add.text(mx + mw / 2, my + mh + 6, "MAP", {
      fontFamily: "'Orbitron', monospace",
      fontSize: "8px",
      color: "#39ff14",
      alpha: 0.5,
    }).setOrigin(0.5, 0)

    this.minimapGfx = this.add.graphics()
  }

  _updateMinimap() {
    const { x, y, w, h } = this._mm
    const gfx = this.minimapGfx
    gfx.clear()

    const toMM = (wx, wy) => ({
      mx: x + (wx / WORLD_SIZE) * w,
      my: y + (wy / WORLD_SIZE) * h,
    })

    // Player dot
    const gameScene = this.scene.get("SnakeScene")
    if (!gameScene || !gameScene.snake) return

    const { mx: px, my: py } = toMM(gameScene.snake.head.x, gameScene.snake.head.y)
    gfx.fillStyle(0x39ff14, 1)
    gfx.fillCircle(px, py, 4)

    // Enemy dots
    for (const e of gameScene.enemyManager.enemies) {
      const { mx: ex, my: ey } = toMM(e.head.x, e.head.y)
      gfx.fillStyle(e.colorHex, 0.85)
      gfx.fillCircle(ex, ey, 2.5)
    }
  }

  // ─── Kill Feed ────────────────────────────────────────────────────────────
  _buildKillFeed() {
    this.killFeedTexts = []
    this.killCount = 0
  }

  addKill(enemyName) {
    this.killCount++
    const ky = 170 + this.killFeedTexts.length * 22
    const t = this.add.text(W - 20, ky, `✕ ${enemyName}`, {
      fontFamily: "'Orbitron', monospace",
      fontSize: "11px",
      color: "#ff4488",
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(1, 0).setAlpha(0)

    this.tweens.add({ targets: t, alpha: 1, duration: 150 })
    this.tweens.add({
      targets: t, alpha: 0, duration: 400,
      delay: 2500,
      onComplete: () => { t.destroy(); this.killFeedTexts.shift() }
    })
    this.killFeedTexts.push(t)
    if (this.killFeedTexts.length > 5) {
      this.killFeedTexts[0].destroy()
      this.killFeedTexts.shift()
    }
  }

  // ─── Death Screen ─────────────────────────────────────────────────────────
  _buildDeathScreen() {
    this.deathOverlay = this.add.graphics().setAlpha(0).setDepth(50)
    this.deathOverlay.fillStyle(0x000000, 0.85)
    this.deathOverlay.fillRect(0, 0, W, H)

    const tf = {
      fontFamily: "'Orbitron', monospace",
      stroke: "#000",
      strokeThickness: 4,
    }
    this.deathTitle = this.add.text(W / 2, H / 2 - 80, "YOU DIED", {
      ...tf, fontSize: "52px", fontStyle: "bold", color: "#ff2d78"
    }).setOrigin(0.5).setAlpha(0).setDepth(51)

    this.deathStats = this.add.text(W / 2, H / 2 + 10, "", {
      ...tf, fontSize: "18px", color: "#39ff14", align: "center"
    }).setOrigin(0.5).setAlpha(0).setDepth(51)

    this.deathBtn = this.add.text(W / 2, H / 2 + 80, "▶  PLAY AGAIN", {
      ...tf, fontSize: "22px", color: "#ffe600",
      backgroundColor: "#1a1a00",
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setAlpha(0).setDepth(51).setInteractive({ useHandCursor: true })

    this.deathBtn.on("pointerover", () => this.deathBtn.setStyle({ color: "#ffffff" }))
    this.deathBtn.on("pointerout",  () => this.deathBtn.setStyle({ color: "#ffe600" }))
    this.deathBtn.on("pointerdown", () => {
      this.deathOverlay.setAlpha(0)
      this.deathTitle.setAlpha(0)
      this.deathStats.setAlpha(0)
      this.deathBtn.setAlpha(0)
      this.scene.stop("UIScene")
      this.scene.start("SnakeScene")
    })
  }

  _showDeathScreen({ score, kills, length }) {
    this.tweens.add({ targets: this.deathOverlay, alpha: 1, duration: 400 })
    this.tweens.add({ targets: this.deathTitle,   alpha: 1, duration: 500, delay: 200 })
    this.deathStats.setText(
      `SCORE: ${score}     LENGTH: ${length}     KILLS: ${kills}`
    )
    this.tweens.add({ targets: this.deathStats, alpha: 1, duration: 500, delay: 500 })
    this.tweens.add({ targets: this.deathBtn,   alpha: 1, duration: 500, delay: 800 })
  }

  // ─── Pause Button (top center) ────────────────────────────────────────────
  _buildPauseButton() {
    const tf = {
      fontFamily: "'Orbitron', monospace",
      fontSize: "11px",
      color: "#39ff14",
      stroke: "#000",
      strokeThickness: 3,
      backgroundColor: "#061208",
      padding: { x: 12, y: 7 },
    }
    this.pauseBtn = this.add.text(W / 2, 14, "❙❙  PAUSE", tf)
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.75)

    this.pauseBtn.on("pointerover", () => this.pauseBtn.setAlpha(1))
    this.pauseBtn.on("pointerout",  () => {
      if (!this.isPaused) this.pauseBtn.setAlpha(0.75)
    })
    this.pauseBtn.on("pointerdown", () => this._togglePause())
  }

  // ─── Pause Overlay ────────────────────────────────────────────────────────
  _buildPauseScreen() {
    this.isPaused = false

    const tf = {
      fontFamily: "'Orbitron', monospace",
      stroke: "#000",
      strokeThickness: 4,
    }

    this.pauseOverlay = this.add.graphics().setAlpha(0).setDepth(60)
    this.pauseOverlay.fillStyle(0x000000, 0.75)
    this.pauseOverlay.fillRect(0, 0, W, H)
    // Neon border box
    this.pauseOverlay.lineStyle(2, 0x39ff14, 0.5)
    this.pauseOverlay.strokeRect(W / 2 - 180, H / 2 - 120, 360, 240)

    this.pauseTitle = this.add.text(W / 2, H / 2 - 70, "PAUSED", {
      ...tf, fontSize: "48px", fontStyle: "bold", color: "#39ff14"
    }).setOrigin(0.5).setAlpha(0).setDepth(61)

    this.pauseHint = this.add.text(W / 2, H / 2 - 10, "Press ESC or click to resume", {
      ...tf, fontSize: "13px", color: "#aaffaa", strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0).setDepth(61)

    this.resumeBtn = this.add.text(W / 2, H / 2 + 50, "▶  RESUME", {
      ...tf, fontSize: "22px", color: "#ffe600",
      backgroundColor: "#1a1a00",
      padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setAlpha(0).setDepth(61).setInteractive({ useHandCursor: true })

    this.resumeBtn.on("pointerover", () => this.resumeBtn.setStyle({ color: "#ffffff" }))
    this.resumeBtn.on("pointerout",  () => this.resumeBtn.setStyle({ color: "#ffe600" }))
    this.resumeBtn.on("pointerdown", () => this._togglePause())

    // Pulse tween on PAUSED title (only runs while visible)
    this._pauseTitleTween = this.tweens.add({
      targets: this.pauseTitle,
      alpha: { from: 1, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      paused: true,
    })
  }

  _togglePause() {
    const gameScene = this.scene.get("SnakeScene")
    if (!gameScene) return

    this.isPaused = !this.isPaused

    if (this.isPaused) {
      // Pause the game scene physics + update
      gameScene.scene.pause()
      // Show overlay
      this.tweens.add({ targets: this.pauseOverlay, alpha: 1, duration: 200 })
      this.tweens.add({ targets: [this.pauseTitle, this.pauseHint, this.resumeBtn], alpha: 1, duration: 250, delay: 100 })
      this._pauseTitleTween.resume()
      this.pauseBtn.setText("▶  RESUME").setAlpha(1)
    } else {
      // Resume game scene
      gameScene.scene.resume()
      // Hide overlay
      this.tweens.add({ targets: [this.pauseOverlay, this.pauseTitle, this.pauseHint, this.resumeBtn], alpha: 0, duration: 200 })
      this._pauseTitleTween.pause()
      this.pauseBtn.setText("❙❙  PAUSE").setAlpha(0.75)
    }
  }
}
