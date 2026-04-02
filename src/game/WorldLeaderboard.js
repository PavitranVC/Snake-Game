import Phaser from "phaser"
import { getLeaderboard, getPlayerName } from "./Leaderboard"

const LEVEL_COLORS = {
  1: { hex: 0x39ff14, str: "#39ff14" },
  2: { hex: 0xffe600, str: "#ffe600" },
  3: { hex: 0xff2d78, str: "#ff2d78" },
}

const RANK_COLORS = ["#ffe600", "#aaaaaa", "#ff7c2a", "#39ff14", "#39ff14"]

/**
 * WorldLeaderboard — a physical glowing scoreboard placed in the game world.
 *
 * Built entirely from Phaser Graphics + Text objects at world coordinates,
 * so it scrolls with the camera like any other world object.
 * Placed near the top-left of the play area so it's visible early in a run.
 * Refreshes every 5 seconds from localStorage.
 */
export default class WorldLeaderboard {
  constructor(scene, worldSize, levelColorHex) {
    this.scene         = scene
    this.worldSize     = worldSize
    this.levelColorHex = levelColorHex || 0x39ff14
    this._objects      = []   // all created objects, for easy cleanup

    // Place the board near the top-left corner of the world,
    // inset from the border so it's always reachable
    this._wx = 220
    this._wy = 220

    this._build()
    this._refresh()

    // Refresh every 5 seconds
    this._timer = scene.time.addEvent({
      delay:    5000,
      loop:     true,
      callback: () => this._refresh(),
    })
  }

  // ─── Build the static chrome (board frame) ────────────────────────────────

  _build() {
    const x  = this._wx
    const y  = this._wy
    const bw = 340
    const bh = 290
    const col = this.levelColorHex

    // Outer glow halo
    const halo = this.scene.add.graphics().setDepth(14)
    halo.fillStyle(col, 0.06)
    halo.fillRoundedRect(x - 18, y - 18, bw + 36, bh + 36, 20)
    this._objects.push(halo)

    // Main card
    const card = this.scene.add.graphics().setDepth(15)
    card.fillStyle(0x020d04, 0.92)
    card.fillRoundedRect(x, y, bw, bh, 12)
    card.lineStyle(2, col, 0.9)
    card.strokeRoundedRect(x, y, bw, bh, 12)
    // Top accent bar
    card.fillStyle(col, 1)
    card.fillRoundedRect(x, y, bw, 6, 12)
    card.fillRect(x, y + 3, bw, 3)
    this._objects.push(card)

    // Corner decorations
    const corners = this.scene.add.graphics().setDepth(16)
    const cs = 14
    ;[[x, y], [x + bw, y], [x, y + bh], [x + bw, y + bh]].forEach(([cx, cy]) => {
      corners.lineStyle(2, col, 0.8)
      corners.strokeRect(cx - cs / 2, cy - cs / 2, cs, cs)
    })
    this._objects.push(corners)

    // Trophy icon + title
    const title = this.scene.add.text(x + bw / 2, y + 18, "🏆  LEADERBOARD", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "13px",
      fontStyle:  "bold",
      color:      "#ffe600",
      stroke:     "#000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(17)
    this._objects.push(title)

    // Column headers
    const hdrY = y + 44
    const hdiv = this.scene.add.graphics().setDepth(16)
    hdiv.lineStyle(1, col, 0.3)
    hdiv.lineBetween(x + 10, hdrY + 14, x + bw - 10, hdrY + 14)
    this._objects.push(hdiv)

    ;[
      [x + 20,       "#"],
      [x + 50,       "PLAYER"],
      [x + bw - 100, "SCORE"],
      [x + bw - 30,  "LV"],
    ].forEach(([hx, label]) => {
      const h = this.scene.add.text(hx, hdrY, label, {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "8px",
        color:      "#4a7a5a",
        letterSpacing: 2,
      }).setDepth(17)
      this._objects.push(h)
    })

    // Row area — 5 rows at 40px each
    this._rowY    = y + 62
    this._rowX    = x
    this._boardW  = bw
    this._rowH    = 40

    // Placeholder row objects — replaced on each refresh
    this._rowObjs = []

    // Bottom pulse line
    const pulse = this.scene.add.graphics().setDepth(16)
    pulse.lineStyle(1, col, 0.25)
    pulse.lineBetween(x + 10, y + bh - 14, x + bw - 10, y + bh - 14)
    this._objects.push(pulse)

    const footer = this.scene.add.text(x + bw / 2, y + bh - 10, "UPDATES EVERY 5 SECONDS", {
      fontFamily: "'Orbitron', monospace",
      fontSize:   "7px",
      color:      "#2a4a3a",
      letterSpacing: 1,
    }).setOrigin(0.5, 1).setDepth(17)
    this._objects.push(footer)

    // Animated neon dot in top-right corner to signal "live"
    this._liveDot = this.scene.add.graphics().setDepth(18)
    this._liveDot.fillStyle(0x39ff14, 1)
    this._liveDot.fillCircle(x + bw - 16, y + 18, 4)
    this._objects.push(this._liveDot)

    // Pulse tween on live dot
    this.scene.tweens.add({
      targets:  this._liveDot,
      alpha:    { from: 1, to: 0.1 },
      duration: 900,
      yoyo:     true,
      repeat:   -1,
      ease:     "Sine.easeInOut",
    })
  }

  // ─── Refresh row content from localStorage ────────────────────────────────

  _refresh() {
    // Destroy previous row objects
    this._rowObjs.forEach(o => o.destroy())
    this._rowObjs = []

    const entries    = getLeaderboard()
    const playerName = getPlayerName()
    const MAX_ROWS   = 5

    for (let i = 0; i < MAX_ROWS; i++) {
      const ry    = this._rowY + i * this._rowH
      const entry = entries[i]
      const rx    = this._rowX
      const bw    = this._boardW

      // Row highlight background for top 3
      if (entry && i < 3) {
        const rowBg = this.scene.add.graphics().setDepth(15)
        rowBg.fillStyle(i === 0 ? 0x1a1400 : 0x0c0c0c, 1)
        rowBg.fillRoundedRect(rx + 6, ry - 2, bw - 12, this._rowH - 4, 6)
        this._rowObjs.push(rowBg)
      }

      // Rank number
      const rankCol = RANK_COLORS[i] || "#39ff14"
      const rankTxt = this.scene.add.text(rx + 20, ry + 10, `${i + 1}`, {
        fontFamily: "'Orbitron', monospace",
        fontSize:   i < 3 ? "14px" : "11px",
        fontStyle:  "bold",
        color:      rankCol,
        stroke:     "#000",
        strokeThickness: 2,
      }).setDepth(17)
      this._rowObjs.push(rankTxt)

      if (!entry) {
        // Empty slot
        const empty = this.scene.add.text(rx + 50, ry + 12, "---", {
          fontFamily: "'Orbitron', monospace",
          fontSize:   "10px",
          color:      "#1a3a2a",
        }).setDepth(17)
        this._rowObjs.push(empty)
        continue
      }

      const isYou    = playerName && entry.name === playerName
      const nameCol  = isYou ? "#39ff14" : i < 3 ? "#ffffff" : "#aaccaa"
      const scoreCol = isYou ? "#39ff14" : rankCol
      const lvlData  = LEVEL_COLORS[entry.levelId] || LEVEL_COLORS[1]

      // Name
      const nameTxt = this.scene.add.text(rx + 50, ry + 6, entry.name || "---", {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "11px",
        fontStyle:  isYou ? "bold" : "normal",
        color:      nameCol,
        stroke:     "#000",
        strokeThickness: 2,
      }).setDepth(17)
      this._rowObjs.push(nameTxt)

      // Date below name
      const dateTxt = this.scene.add.text(rx + 50, ry + 22, entry.date || "", {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "8px",
        color:      "#2a4a3a",
      }).setDepth(17)
      this._rowObjs.push(dateTxt)

      // Score
      const scoreTxt = this.scene.add.text(rx + bw - 100, ry + 10, String(entry.score || 0), {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "12px",
        fontStyle:  "bold",
        color:      scoreCol,
        stroke:     "#000",
        strokeThickness: 2,
      }).setDepth(17)
      this._rowObjs.push(scoreTxt)

      // Level badge
      const lvlTxt = this.scene.add.text(rx + bw - 28, ry + 10, `L${entry.levelId || 1}`, {
        fontFamily: "'Orbitron', monospace",
        fontSize:   "10px",
        fontStyle:  "bold",
        color:      lvlData.str,
        stroke:     "#000",
        strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(17)
      this._rowObjs.push(lvlTxt)

      // "YOU" tag
      if (isYou) {
        const youTag = this.scene.add.text(rx + bw - 28, ry + 24, "YOU", {
          fontFamily: "'Orbitron', monospace",
          fontSize:   "7px",
          color:      "#39ff14",
          stroke:     "#000",
          strokeThickness: 2,
        }).setOrigin(0.5, 0).setDepth(17)
        this._rowObjs.push(youTag)
      }

      // Row divider (not after last row)
      if (i < MAX_ROWS - 1) {
        const div = this.scene.add.graphics().setDepth(16)
        div.lineStyle(1, 0x0a2a12, 1)
        div.lineBetween(rx + 10, ry + this._rowH - 2, rx + bw - 10, ry + this._rowH - 2)
        this._rowObjs.push(div)
      }
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    if (this._timer) this._timer.remove()
    this._objects.forEach(o => o.destroy())
    this._rowObjs.forEach(o => o.destroy())
  }
}
