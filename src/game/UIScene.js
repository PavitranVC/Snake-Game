import Phaser from "phaser"
import { BOOST_MAX, BOOST_COOLDOWN_MS, WORLD_SIZE } from "./constants.js"

const W = 1280, H = 720

export default class UIScene extends Phaser.Scene {
  constructor() { super({ key: "UIScene" }) }

  create() {
    this.stats = { score: 0, length: 1, kills: 0, boost: BOOST_MAX }
    this._buildScorePanel()
    this._buildBoostBar()
    this._buildKillBar()
    this._buildMinimap()
    this._buildKillFeed()
    this._buildPauseButton()
    this._buildPauseScreen()
    this._buildDeathScreen()
    this._buildPowerupBanner()
    this.input.keyboard.on("keydown-ESC", () => this._togglePause())
  }

  shutdown() {}

  setStats(s) {
    this.stats = s
    this._updateScorePanel()
    this._updateBoostBar()
    this._updateKillBar()
    this._updateMinimap()
  }

  flashPowerup(type) {
    const f = this.add.text(W/2, H/2-60, `${type.label}  ${type.desc}`, {
      fontFamily: "'Orbitron', monospace", fontSize: "18px", color: type.glow, stroke: "#000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(55).setAlpha(0)
    this.tweens.add({ targets: f, alpha: 1, y: H/2-80, duration: 200 })
    this.tweens.add({ targets: f, alpha: 0, y: H/2-100, duration: 400, delay: 1200, onComplete: () => f.destroy() })
  }

  showPowerup(type) {
    const labels = { boost_refill: "⚡ BOOST REFILLED!", boost_regen: "↑ REGEN BOOST ×3 for 10s", boost_capacity: "◈ BOOST TANK EXPANDED for 15s" }
    const colors = { boost_refill: "#00ffff", boost_regen: "#ffe600", boost_capacity: "#ff7c2a" }
    this.powerupBanner.setText(labels[type.id] || type.id).setStyle({ color: colors[type.id] || "#fff" }).setAlpha(1)
    this.tweens.killTweensOf(this.powerupBanner)
    this.tweens.add({ targets: this.powerupBanner, alpha: 0, duration: 500, delay: 2000 })
  }

  // ─── Score Panel ──────────────────────────────────────────────────────────
  _buildScorePanel() {
    const px = 20, py = 20
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.55); bg.fillRoundedRect(px, py, 220, 100, 10)
    bg.lineStyle(1.5, 0x39ff14, 0.5); bg.strokeRoundedRect(px, py, 220, 100, 10)
    const tf = { fontFamily: "'Orbitron', monospace", stroke: "#000", strokeThickness: 3 }
    this.add.text(px+14, py+10, "SCORE",  { ...tf, fontSize: "10px", color: "#44ff88" })
    this.scoreVal  = this.add.text(px+14, py+24, "0", { ...tf, fontSize: "28px", fontStyle: "bold", color: "#39ff14" })
    this.add.text(px+14, py+60, "LENGTH", { ...tf, fontSize: "10px", color: "#44ff88" })
    this.lenVal    = this.add.text(px+14, py+73, "1", { ...tf, fontSize: "18px", color: "#39ff14" })
    this.add.text(px+130, py+60, "KILLS", { ...tf, fontSize: "10px", color: "#ff4488" })
    this.killsVal  = this.add.text(px+130, py+73, "0", { ...tf, fontSize: "18px", color: "#ff4488" })
  }

  _updateScorePanel() {
    this.scoreVal.setText(String(this.stats.score))
    this.lenVal.setText(String(this.stats.length))
    this.killsVal.setText(String(this.stats.kills))
  }

  // ─── Boost Bar ────────────────────────────────────────────────────────────
  _buildBoostBar() {
    const bx = W/2-100, by = H-36, bw = 200, bh = 14
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.6); bg.fillRoundedRect(bx-2, by-2, bw+4, bh+4, 7)
    bg.lineStyle(1, 0x39ff14, 0.3); bg.strokeRoundedRect(bx-2, by-2, bw+4, bh+4, 7)
    this.boostFill  = this.add.graphics()
    this.boostLabel = this.add.text(W/2, by-18, "BOOST  [SPACE]", {
      fontFamily: "'Orbitron', monospace", fontSize: "9px", color: "#39ff14", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5, 0)
    this._bx = bx; this._by = by; this._bw = bw; this._bh = bh
  }

  _updateBoostBar() {
    const boost  = this.stats.boost    || 0
    const bMax   = this.stats.boostMax || BOOST_MAX
    const cdPct  = Math.max(0, Math.min(1, this.stats.cooldownPct || 0))
    const pct    = Math.max(0, Math.min(1, boost / bMax))
    const { _bx: bx, _by: by, _bw: bw, _bh: bh } = this
    this.boostFill.clear()
    if (cdPct > 0) {
      this.boostFill.fillStyle(0xff2d00, 0.3); this.boostFill.fillRoundedRect(bx, by, bw*cdPct, bh, 6)
      if (Math.sin(Date.now()/150) > 0) { this.boostFill.fillStyle(0xff4400, 0.15); this.boostFill.fillRoundedRect(bx, by, bw, bh, 6) }
      this.boostLabel.setText("BOOST  COOLDOWN...").setStyle({ color: "#ff4400" })
    } else if (pct > 0) {
      this.boostFill.fillStyle(pct > 0.3 ? 0x39ff14 : 0xff8800, 0.9); this.boostFill.fillRoundedRect(bx, by, bw*pct, bh, 6)
      if (pct > 0.95) { this.boostFill.fillStyle(0x39ff14, 0.2); this.boostFill.fillRoundedRect(bx, by, bw, bh, 6) }
      this.boostLabel.setText("BOOST  [SPACE]").setStyle({ color: "#39ff14" })
    } else {
      this.boostLabel.setText("BOOST  EMPTY").setStyle({ color: "#ff4400" })
    }
  }

  // ─── Kill Bar ─────────────────────────────────────────────────────────────
  _buildKillBar() {
    const kx = W-240, ky = 118, kw = 220, kh = 14
    this._kx = kx; this._ky = ky; this._kw = kw; this._kh = kh
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.55); bg.fillRoundedRect(kx-2, ky-2, kw+4, kh+4, 7)
    bg.lineStyle(1, 0xff2d78, 0.3); bg.strokeRoundedRect(kx-2, ky-2, kw+4, kh+4, 7)
    this.killBarFill  = this.add.graphics()
    this.killBarLabel = this.add.text(kx+kw/2, ky-18, "KILLS  0 / ?", {
      fontFamily: "'Orbitron', monospace", fontSize: "9px", color: "#ff2d78", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5, 0)
  }

  _updateKillBar() {
    const kills  = this.stats.kills      || 0
    const target = this.stats.killTarget || 5
    const color  = this.stats.levelColor || "#ff2d78"
    const pct    = Math.min(1, kills / target)
    this.killBarLabel.setText(`KILLS  ${kills} / ${target}`).setStyle({ color })
    const { _kx: kx, _ky: ky, _kw: kw, _kh: kh } = this
    this.killBarFill.clear()
    if (pct > 0) {
      const col = Phaser.Display.Color.HexStringToColor(color).color
      this.killBarFill.fillStyle(col, 0.9); this.killBarFill.fillRoundedRect(kx, ky, kw*pct, kh, 6)
      if (pct > 0.8) { this.killBarFill.fillStyle(col, 0.2); this.killBarFill.fillRoundedRect(kx, ky, kw, kh, 6) }
    }
  }

  // ─── Minimap ──────────────────────────────────────────────────────────────
  _buildMinimap() {
    const mx = W-150, my = 20, mw = 130, mh = 130
    this._mm = { x: mx, y: my, w: mw, h: mh }
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.65); bg.fillRoundedRect(mx-2, my-2, mw+4, mh+4, 8)
    bg.lineStyle(1.5, 0x39ff14, 0.4); bg.strokeRoundedRect(mx-2, my-2, mw+4, mh+4, 8)
    this.add.text(mx+mw/2, my+mh+6, "MAP", { fontFamily: "'Orbitron', monospace", fontSize: "8px", color: "#39ff14" }).setOrigin(0.5, 0)
    this.minimapGfx = this.add.graphics()
  }

  _updateMinimap() {
    const { x, y, w, h } = this._mm
    const gfx = this.minimapGfx
    gfx.clear()
    if (this.stats.playerTheta !== undefined) {
      const toMM = (t, p) => ({ mx: x + (p / (Math.PI*2)) * w, my: y + (t / Math.PI) * h })
      const { mx: px, my: py } = toMM(this.stats.playerTheta, this.stats.playerPhi)
      gfx.fillStyle(0x39ff14, 1); gfx.fillCircle(px, py, 4)
      for (const e of (this.stats.enemyPositions || [])) {
        const { mx: ex, my: ey } = toMM(e.theta, e.phi)
        gfx.fillStyle(e.colorHex, 0.85); gfx.fillCircle(ex, ey, 2.5)
      }
    }
  }

  // ─── Kill Feed ────────────────────────────────────────────────────────────
  _buildKillFeed() { this.killFeedTexts = [] }

  addKill(name) {
    this.killFeedTexts.forEach(t => { t.y -= 22 })
    const ky = 170 + Math.min(this.killFeedTexts.length, 4) * 22
    const t  = this.add.text(W-20, ky, `✕ ${name}`, {
      fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#ff4488", stroke: "#000", strokeThickness: 2,
    }).setOrigin(1, 0).setAlpha(0)
    this.tweens.add({ targets: t, alpha: 1, duration: 150 })
    this.tweens.add({ targets: t, alpha: 0, duration: 400, delay: 2500, onComplete: () => { t.destroy(); this.killFeedTexts = this.killFeedTexts.filter(x => x !== t) } })
    this.killFeedTexts.push(t)
    if (this.killFeedTexts.length > 5) this.killFeedTexts.shift()?.destroy()
  }

  // ─── Death Screen ─────────────────────────────────────────────────────────
  _buildDeathScreen() {
    this.deathOverlay = this.add.graphics().setAlpha(0).setDepth(50)
    this.deathOverlay.fillStyle(0x000000, 0.85); this.deathOverlay.fillRect(0, 0, W, H)
    const tf = { fontFamily: "'Orbitron', monospace", stroke: "#000", strokeThickness: 4 }
    this.deathTitle = this.add.text(W/2, H/2-80, "YOU DIED", { ...tf, fontSize: "52px", fontStyle: "bold", color: "#ff2d78" }).setOrigin(0.5).setAlpha(0).setDepth(51)
    this.deathStats = this.add.text(W/2, H/2+10, "", { ...tf, fontSize: "18px", color: "#39ff14", align: "center" }).setOrigin(0.5).setAlpha(0).setDepth(51)

    this.deathBtn = this.add.text(W/2, H/2+80, "▶  PLAY AGAIN", { ...tf, fontSize: "22px", color: "#ffe600", backgroundColor: "#1a1a00", padding: { x: 24, y: 10 } })
      .setOrigin(0.5).setAlpha(0).setDepth(51).setInteractive({ useHandCursor: true })
    this.deathBtn.on("pointerover", () => this.deathBtn.setStyle({ color: "#fff" }))
    this.deathBtn.on("pointerout",  () => this.deathBtn.setStyle({ color: "#ffe600" }))
    this.deathBtn.on("pointerdown", () => {
      [this.deathOverlay, this.deathTitle, this.deathStats, this.deathBtn, this._menuBtn].forEach(o => o.setAlpha(0))
      this.scene.stop("UIScene")
      window.dispatchEvent(new CustomEvent("planet-restart", { detail: { levelId: this._lastDeath?.levelId ?? 1 } }))
    })

    this._menuBtn = this.add.text(W/2, H/2+130, "⌂  MAIN MENU", { ...tf, fontSize: "14px", color: "#7aaa88", backgroundColor: "#0a1208", padding: { x: 18, y: 8 } })
      .setOrigin(0.5).setAlpha(0).setDepth(51).setInteractive({ useHandCursor: true })
    this._menuBtn.on("pointerdown", () => { this.scene.stop("UIScene"); this.scene.start("MenuScene") })
  }

  _showDeathScreen(data) {
    this._lastDeath = data
    this.tweens.add({ targets: this.deathOverlay, alpha: 1, duration: 400 })
    this.tweens.add({ targets: this.deathTitle,   alpha: 1, duration: 500, delay: 200 })
    this.deathStats.setText(`SCORE: ${data.score}     LENGTH: ${data.length}     KILLS: ${data.kills}`)
    this.tweens.add({ targets: this.deathStats, alpha: 1, duration: 500, delay: 500 })
    this.tweens.add({ targets: this.deathBtn,   alpha: 1, duration: 500, delay: 800 })
    this.tweens.add({ targets: this._menuBtn,   alpha: 1, duration: 500, delay: 1000 })
  }

  // ─── Pause ────────────────────────────────────────────────────────────────
  _buildPauseButton() {
    this.pauseBtn = this.add.text(W/2, 14, "❙❙  PAUSE", {
      fontFamily: "'Orbitron', monospace", fontSize: "11px", color: "#39ff14",
      stroke: "#000", strokeThickness: 3, backgroundColor: "#061208", padding: { x: 12, y: 7 },
    }).setOrigin(0.5, 0).setDepth(20).setInteractive({ useHandCursor: true }).setAlpha(0.75)
    this.pauseBtn.on("pointerover", () => this.pauseBtn.setAlpha(1))
    this.pauseBtn.on("pointerout",  () => { if (!this.isPaused) this.pauseBtn.setAlpha(0.75) })
    this.pauseBtn.on("pointerdown", () => this._togglePause())
  }

  _buildPauseScreen() {
    this.isPaused = false
    const tf = { fontFamily: "'Orbitron', monospace", stroke: "#000", strokeThickness: 4 }
    this.pauseOverlay = this.add.graphics().setAlpha(0).setDepth(60)
    this.pauseOverlay.fillStyle(0x000000, 0.75); this.pauseOverlay.fillRect(0, 0, W, H)
    this.pauseOverlay.lineStyle(2, 0x39ff14, 0.5); this.pauseOverlay.strokeRect(W/2-180, H/2-120, 360, 240)
    this.pauseTitle = this.add.text(W/2, H/2-70, "PAUSED", { ...tf, fontSize: "48px", fontStyle: "bold", color: "#39ff14" }).setOrigin(0.5).setAlpha(0).setDepth(61)
    this.pauseHint  = this.add.text(W/2, H/2-10, "Press ESC or click to resume", { ...tf, fontSize: "13px", color: "#aaffaa", strokeThickness: 2 }).setOrigin(0.5).setAlpha(0).setDepth(61)
    this.resumeBtn  = this.add.text(W/2, H/2+50, "▶  RESUME", { ...tf, fontSize: "22px", color: "#ffe600", backgroundColor: "#1a1a00", padding: { x: 28, y: 12 } }).setOrigin(0.5).setAlpha(0).setDepth(61).setInteractive({ useHandCursor: true })
    this.resumeBtn.on("pointerover", () => this.resumeBtn.setStyle({ color: "#fff" }))
    this.resumeBtn.on("pointerout",  () => this.resumeBtn.setStyle({ color: "#ffe600" }))
    this.resumeBtn.on("pointerdown", () => this._togglePause())
    this._pauseTween = this.tweens.add({ targets: this.pauseTitle, alpha: { from: 1, to: 0.4 }, duration: 800, yoyo: true, repeat: -1, paused: true })
  }

  _buildPowerupBanner() {
    this.powerupBanner = this.add.text(W/2, H-80, "", {
      fontFamily: "'Orbitron', monospace", fontSize: "14px", color: "#00ffff",
      stroke: "#000", strokeThickness: 3, backgroundColor: "#001a1a", padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(30)
  }

  _togglePause() {
    this.isPaused = !this.isPaused
    window.dispatchEvent(new CustomEvent("planet-toggle-pause"))
    if (this.isPaused) {
      this.tweens.add({ targets: this.pauseOverlay, alpha: 1, duration: 200 })
      this.tweens.add({ targets: [this.pauseTitle, this.pauseHint, this.resumeBtn], alpha: 1, duration: 250, delay: 100 })
      this._pauseTween.resume()
      this.pauseBtn.setText("▶  RESUME").setAlpha(1)
    } else {
      this.tweens.add({ targets: [this.pauseOverlay, this.pauseTitle, this.pauseHint, this.resumeBtn], alpha: 0, duration: 200 })
      this._pauseTween.pause()
      this.pauseBtn.setText("❙❙  PAUSE").setAlpha(0.75)
    }
  }
}
