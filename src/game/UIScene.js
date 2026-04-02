import Phaser from "phaser"
import { BOOST_MAX, BOOST_COOLDOWN_MS, WORLD_SIZE, PLAYER_COLOR, ENEMY_COLORS } from "./constants"
import { saveScore, getPlayerName } from "./Leaderboard"
import { getLevelConfig } from "./LevelConfig"

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
    this._buildMenuButton()
    this._buildBoostBar()
    this._buildKillBar()
    this._buildMinimap()
    this._buildLiveRankPanel()
    this._buildKillFeed()
    this._buildPauseButton()
    this._buildPauseScreen()
    this._buildDeathScreen()
    this._buildPowerupBanner()

    // Listen for game events from SnakeScene
    const gameScene = this.scene.get("SnakeScene")
    if (gameScene) {
      gameScene.events.on("playerDied",       data => this._showDeathScreen(data))
      gameScene.events.on("powerupCollected", type => this.flashPowerup(type))
    }

    // ESC key toggles pause
    this.input.keyboard.on("keydown-ESC", () => this._togglePause())
  }

  // Called every frame from SnakeScene._syncUI
  setStats(s) {
    this.stats = s
    this._updateScorePanel()
    this._updateBoostBar()
    this._updateKillBar()
    this._updateMinimap()
    this._updateLiveRank()
  }

  // Called when player collects a powerup
  flashPowerup(type) {
    const flash = this.add.text(W / 2, H / 2 - 60, type.label + '  ' + type.desc, {
      fontFamily: "'Orbitron', monospace",
      fontSize: "18px",
      color: type.glow,
      stroke: "#000",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(55).setAlpha(0)
    this.tweens.add({ targets: flash, alpha: 1, y: H / 2 - 80, duration: 200 })
    this.tweens.add({ targets: flash, alpha: 0, y: H / 2 - 100, duration: 400, delay: 1200, onComplete: () => flash.destroy() })
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

  // ─── In-game Menu Button (below score panel, top-left) ──────────────────
  _buildMenuButton() {
    // Sits flush below the score card (score card ends at y:120)
    const mx = 20, my = 128
    const bg = this.add.graphics().setDepth(20)
    bg.fillStyle(0x000000, 0.55)
    bg.fillRoundedRect(mx, my, 100, 26, 6)
    bg.lineStyle(1, 0x39ff14, 0.35)
    bg.strokeRoundedRect(mx, my, 100, 26, 6)

    this._inGameMenuBtn = this.add.text(mx + 50, my + 13, "⌂  MENU", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "10px",
      color:      "#7aaa88",
      stroke:     "#000",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true })

    this._inGameMenuBtn.on("pointerover", () => {
      bg.clear()
      bg.fillStyle(0x0a2010, 0.85)
      bg.fillRoundedRect(mx, my, 100, 26, 6)
      bg.lineStyle(1.5, 0x39ff14, 0.8)
      bg.strokeRoundedRect(mx, my, 100, 26, 6)
      this._inGameMenuBtn.setStyle({ color: "#39ff14" })
    })
    this._inGameMenuBtn.on("pointerout", () => {
      bg.clear()
      bg.fillStyle(0x000000, 0.55)
      bg.fillRoundedRect(mx, my, 100, 26, 6)
      bg.lineStyle(1, 0x39ff14, 0.35)
      bg.strokeRoundedRect(mx, my, 100, 26, 6)
      this._inGameMenuBtn.setStyle({ color: "#7aaa88" })
    })
    this._inGameMenuBtn.on("pointerdown", () => {
      // Resume game first if paused, then go to menu
      const gameScene = this.scene.get("SnakeScene")
      if (gameScene) gameScene.scene.resume()
      this.scene.stop("UIScene")
      this.scene.stop("SnakeScene")
      this.scene.start("MenuScene")
    })
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
    const boost    = this.stats.boost    || 0
    const cooldown = this.stats.cooldown || 0
    const boostMax = this.stats.boostMax || BOOST_MAX
    const pct      = Math.max(0, Math.min(1, boost / boostMax))
    const cdPct    = Math.max(0, Math.min(1, cooldown / BOOST_COOLDOWN_MS))
    const bx = this._boostBarX
    const by = this._boostBarY
    const bw = this._boostBarW
    const bh = this._boostBarH

    this.boostFill.clear()

    if (cdPct > 0) {
      // Cooldown state — show a red shrinking bar representing time until regen
      this.boostFill.fillStyle(0xff2d00, 0.3)
      this.boostFill.fillRoundedRect(bx, by, bw * cdPct, bh, 6)
      // Flashing label
      const flash = Math.sin(Date.now() / 150) > 0
      if (flash) {
        this.boostFill.fillStyle(0xff4400, 0.15)
        this.boostFill.fillRoundedRect(bx, by, bw, bh, 6)
      }
      this.boostLabel.setText("BOOST  COOLDOWN...")
        .setStyle({ color: "#ff4400" })
    } else if (pct > 0) {
      // Normal state
      const color = pct > 0.3 ? 0x39ff14 : 0xff8800
      this.boostFill.fillStyle(color, 0.9)
      this.boostFill.fillRoundedRect(bx, by, bw * pct, bh, 6)
      if (pct > 0.95) {
        this.boostFill.fillStyle(0x39ff14, 0.2)
        this.boostFill.fillRoundedRect(bx, by, bw, bh, 6)
      }
      this.boostLabel.setText("BOOST  [SPACE]")
        .setStyle({ color: "#39ff14" })
    } else {
      this.boostLabel.setText("BOOST  EMPTY")
        .setStyle({ color: "#ff4400" })
    }
  }

  // ─── Kill Progress Bar (bottom-left — no overlap with any other element) ──
  _buildKillBar() {
    // Sits in the bottom-left corner, above the floor.
    // Score panel is top-left (y:20–120). Boost bar is bottom-center.
    // This zone (x:20, y:H-90) is completely clear.
    const kx = 20, ky = H - 72, kw = 220, kh = 14
    this._killBarX = kx; this._killBarY = ky
    this._killBarW = kw; this._killBarH = kh

    // Card background matching score panel style
    this.killBarCard = this.add.graphics()
    this.killBarCard.fillStyle(0x000000, 0.55)
    this.killBarCard.fillRoundedRect(kx - 4, ky - 28, kw + 8, kh + 36, 10)

    this.killBarFill = this.add.graphics()

    this.killBarLabel = this.add.text(kx, ky - 20, "OBJECTIVE", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "9px",
      color:      "#7aaa88",
      stroke:     "#000",
      strokeThickness: 2,
    })

    this.killBarCount = this.add.text(kx + kw, ky - 20, "0 / ?", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "9px",
      color:      "#ff2d78",
      stroke:     "#000",
      strokeThickness: 2,
    }).setOrigin(1, 0)
  }

  _updateKillBar() {
    const kills  = this.stats.kills      || 0
    const target = this.stats.killTarget || 5
    const color  = this.stats.levelColor || "#ff2d78"
    const pct    = Math.min(1, kills / target)

    // Update card border color to match level
    const col = Phaser.Display.Color.HexStringToColor(color).color
    this.killBarCard.clear()
    this.killBarCard.fillStyle(0x000000, 0.55)
    this.killBarCard.fillRoundedRect(
      this._killBarX - 4, this._killBarY - 28,
      this._killBarW + 8, this._killBarH + 36, 10
    )
    this.killBarCard.lineStyle(1.5, col, 0.5)
    this.killBarCard.strokeRoundedRect(
      this._killBarX - 4, this._killBarY - 28,
      this._killBarW + 8, this._killBarH + 36, 10
    )

    this.killBarCount.setText(`${kills} / ${target}`).setStyle({ color })

    // Fill bar
    this.killBarFill.clear()
    if (pct > 0) {
      this.killBarFill.fillStyle(col, 0.9)
      this.killBarFill.fillRoundedRect(
        this._killBarX, this._killBarY, this._killBarW * pct, this._killBarH, 6
      )
      // Glow when nearly complete
      if (pct > 0.8) {
        this.killBarFill.fillStyle(col, 0.2)
        this.killBarFill.fillRoundedRect(
          this._killBarX, this._killBarY, this._killBarW, this._killBarH, 6
        )
      }
    }
    // Track bg
    this.killBarFill.lineStyle(1, col, 0.25)
    this.killBarFill.strokeRoundedRect(
      this._killBarX, this._killBarY, this._killBarW, this._killBarH, 6
    )
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

  // ─── Live In-Game Ranking Panel ──────────────────────────────────────────
  // Position: right column, directly below minimap (minimap ends at y≈165)
  // Width: 130px matching minimap width. Shows top 5 + player if outside top 5.
  _buildLiveRankPanel() {
    const mx = W - 150, my = 168, mw = 130
    this._lrX = mx; this._lrY = my; this._lrW = mw

    // Card background — same style as minimap
    this.lrBg = this.add.graphics()
    this.lrBg.fillStyle(0x000000, 0.65)
    this.lrBg.fillRoundedRect(mx - 2, my - 2, mw + 4, 228, 8)
    this.lrBg.lineStyle(1.5, 0x39ff14, 0.35)
    this.lrBg.strokeRoundedRect(mx - 2, my - 2, mw + 4, 228, 8)

    // Title
    this.add.text(mx + mw / 2, my + 6, "RANKINGS", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "8px",
      color:      "#7aaa88",
      letterSpacing: 3,
    }).setOrigin(0.5, 0)

    // Divider
    const div = this.add.graphics()
    div.lineStyle(1, 0x39ff14, 0.2)
    div.lineBetween(mx + 4, my + 22, mx + mw - 4, my + 22)

    // 6 row slots: 5 for top 5, 1 for player-if-outside
    // Each row: rank label + name + score — 32px tall
    this._lrRows = []
    for (let i = 0; i < 6; i++) {
      const ry = my + 28 + i * 32

      // Rank / separator text
      const rankTxt = this.add.text(mx + 8, ry + 4, "", {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "10px",
        fontStyle:  "bold",
        color:      "#39ff14",
        stroke:     "#000",
        strokeThickness: 2,
      })

      // Name
      const nameTxt = this.add.text(mx + 26, ry + 4, "", {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "9px",
        color:      "#aaccaa",
        stroke:     "#000",
        strokeThickness: 2,
      })

      // Score (right-aligned)
      const scoreTxt = this.add.text(mx + mw - 6, ry + 4, "", {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "8px",
        color:      "#7aaa88",
        stroke:     "#000",
        strokeThickness: 2,
      }).setOrigin(1, 0)

      // Row highlight bg (only visible when player row)
      const rowBg = this.add.graphics()

      this._lrRows.push({ rankTxt, nameTxt, scoreTxt, rowBg, ry })
    }
  }

  _updateLiveRank() {
    if (!this.stats.liveRanking) return
    const { all, playerRank } = this.stats.liveRanking
    const mx = this._lrX, mw = this._lrW

    const RANK_COLS = ["#ffe600", "#aaaaaa", "#ff7c2a", "#aaccaa", "#aaccaa"]

    // Rows 0-4 always show top 5 (or empty if fewer snakes)
    for (let i = 0; i < 5; i++) {
      const row   = this._lrRows[i]
      const entry = all[i]

      row.rowBg.clear()

      if (!entry) {
        row.rankTxt.setText("")
        row.nameTxt.setText("")
        row.scoreTxt.setText("")
        continue
      }

      const isPlayer = entry.isPlayer
      const col = isPlayer ? "#39ff14" : RANK_COLS[i]

      // Highlight player row
      if (isPlayer) {
        row.rowBg.fillStyle(0x0a2010, 0.8)
        row.rowBg.fillRoundedRect(mx, row.ry, mw, 28, 4)
      }

      row.rankTxt.setText(`${i + 1}`).setStyle({ color: col })
      // Truncate name to fit: max 8 chars
      const displayName = isPlayer ? "YOU" : (entry.name || "?").slice(0, 8)
      row.nameTxt.setText(displayName).setStyle({
        color:     isPlayer ? "#39ff14" : entry.colorStr || "#aaccaa",
        fontStyle: isPlayer ? "bold" : "normal",
      })
      row.scoreTxt.setText(String(entry.score)).setStyle({ color: col })
    }

    // Row 5 — show player if outside top 5, else hide
    const row5 = this._lrRows[5]
    row5.rowBg.clear()

    if (playerRank > 5) {
      // Show "..." separator then player row
      row5.rowBg.fillStyle(0x0a2010, 0.8)
      row5.rowBg.fillRoundedRect(mx, row5.ry, mw, 28, 4)

      row5.rankTxt.setText("...").setStyle({ color: "#444", fontSize: "8px" })
      row5.nameTxt.setText("YOU").setStyle({ color: "#39ff14", fontStyle: "bold", fontSize: "9px" })
      row5.scoreTxt.setText(String(all[playerRank - 1]?.score || 0)).setStyle({ color: "#39ff14" })
    } else {
      row5.rankTxt.setText("")
      row5.nameTxt.setText("")
      row5.scoreTxt.setText("")
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
      this._menuBtn.setAlpha(0)
      if (this._lbBtn) this._lbBtn.setAlpha(0)
      const levelId = this._lastDeathData?.levelId ?? 1
      this.scene.stop("UIScene")
      this.scene.start("SnakeScene", { levelId })
    })

    // Menu button on death screen
    this._menuBtn = this.add.text(W / 2, H / 2 + 130, "⌂  MAIN MENU", {
      ...tf, fontSize: "14px", color: "#7aaa88",
      backgroundColor: "#0a1208",
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(51).setInteractive({ useHandCursor: true })
    this._menuBtn.on("pointerdown", () => {
      this.scene.stop("UIScene")
      this.scene.stop("SnakeScene")
      this.scene.start("MenuScene")
    })

    // Leaderboard button on death screen
    this._lbBtn = this.add.text(W / 2, H / 2 + 180, "🏆  VIEW LEADERBOARD", {
      ...tf, fontSize: "12px", color: "#ffe600",
      backgroundColor: "#1a1400",
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(51).setInteractive({ useHandCursor: true })
    this._lbBtn.on("pointerdown", () => {
      this.scene.stop("UIScene")
      this.scene.stop("SnakeScene")
      this.scene.start("LeaderboardScene")
    })
  }

  _showDeathScreen(data) {
    const { score, kills, length, levelId } = data
    this._lastDeathData = data

    // Save to leaderboard
    const name = getPlayerName() || "ANONYMOUS"
    const cfg  = getLevelConfig(levelId || 1)
    const rank = saveScore({ name, score, kills, length, levelId: levelId || 1, levelName: cfg.name })
    this._lastRank = rank
    this.tweens.add({ targets: this.deathOverlay, alpha: 1, duration: 400 })
    this.tweens.add({ targets: this.deathTitle,   alpha: 1, duration: 500, delay: 200 })
    const rankStr = this._lastRank ? `  ·  RANK #${this._lastRank}` : ""
    this.deathStats.setText(
      `SCORE: ${score}     LENGTH: ${length}     KILLS: ${kills}${rankStr}`
    )
    this.tweens.add({ targets: this.deathStats, alpha: 1, duration: 500, delay: 500 })
    this.tweens.add({ targets: this.deathBtn,   alpha: 1, duration: 500, delay: 800 })
    this.tweens.add({ targets: this._menuBtn,  alpha: 1, duration: 500, delay: 1000 })
    this.tweens.add({ targets: this._lbBtn,    alpha: 1, duration: 500, delay: 1100 })
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

  // ─── Powerup Banner ──────────────────────────────────────────────────────
  _buildPowerupBanner() {
    this.powerupBanner = this.add.text(W / 2, H - 80, "", {
      fontFamily: "'Orbitron', monospace",
      fontSize: "14px",
      color: "#00ffff",
      stroke: "#000",
      strokeThickness: 3,
      backgroundColor: "#001a1a",
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(30)
  }

  showPowerup(type) {
    const labels = {
      boost_refill:   "⚡ BOOST REFILLED!",
      boost_regen:    "↑ REGEN BOOST  ×3  for 10s",
      boost_capacity: "◈ BOOST TANK EXPANDED  for 15s",
    }
    const colors = {
      boost_refill:   "#00ffff",
      boost_regen:    "#ffe600",
      boost_capacity: "#ff7c2a",
    }
    this.powerupBanner
      .setText(labels[type.id] || type.id)
      .setStyle({ color: colors[type.id] || "#ffffff" })
      .setAlpha(1)

    this.tweens.killTweensOf(this.powerupBanner)
    this.tweens.add({
      targets: this.powerupBanner, alpha: 0,
      duration: 500, delay: 2000,
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
