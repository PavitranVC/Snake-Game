import * as THREE from "three"
import PlanetSnakeBase from "./PlanetSnakeBase.js"
import { ENEMY_COLORS } from "./constants.js"

export default class PlanetEnemySnake extends PlanetSnakeBase {
  constructor(scene3d, theta, phi, colorIndex, cfg = {}) {
    const palette = ENEMY_COLORS[colorIndex % ENEMY_COLORS.length]
    super(scene3d, theta, phi, palette.hex, cfg.planetRadius || 800)

    this.colorHex  = palette.hex
    this.snakeName = palette.name + " #" + (colorIndex + 1)

    const R = cfg.planetRadius || 800
    const speedMin = cfg.enemySpeedMin ?? 110
    const speedMax = cfg.enemySpeedMax ?? 160
    this.angularSpeed = (speedMin + Math.random() * (speedMax - speedMin)) / R
    this.turnSpeed    = 1.8 + Math.random() * 1.4

    this.aggression           = cfg.aggression           ?? 0
    this.fleeRange            = (cfg.fleeRange ?? 250) / R
    this.huntRange            = (cfg.huntRange ?? 200) / R
    this.targetPlayerDirectly = cfg.targetPlayerDirectly ?? false

    this._targetTheta = null
    this._targetPhi   = null
    this._wanderAngle = Math.random() * Math.PI * 2
    this._targetTimer = Math.floor(Math.random() * 20)
    this._isDead      = false

    for (let i = 0; i < 4; i++) this._addBodySegment()

    // DOM label
    this._label = document.createElement("div")
    this._label.style.cssText = `position:absolute;pointer-events:none;font-family:'Orbitron',monospace;font-size:10px;color:${palette.glow};white-space:nowrap;transform:translate(-50%,-100%);text-shadow:0 0 4px ${palette.glow};`
    this._label.textContent = palette.name
    document.getElementById("planet-hud")?.appendChild(this._label)
  }

  update(playerSnake, allEnemies, dt) {
    this._findTarget(playerSnake, allEnemies)
    this._steer(dt)
    this._stepOnSphere(this.angularSpeed * dt)
    this._updateHistory()
    this._updateBodyMeshes()
    this._updateEyes()
    this._updateLabel()
  }

  _findTarget(player, allEnemies) {
    this._targetTimer++
    const scanRate = this.aggression === 2 ? 8 : this.aggression === 1 ? 14 : 20
    if (this._targetTimer < scanRate) return
    this._targetTimer = 0
    const myLen = this.body.length

    if (this.targetPlayerDirectly) {
      if (this.angularDistanceTo(player.theta, player.phi) < this.huntRange) {
        this._targetTheta = player.theta; this._targetPhi = player.phi; return
      }
    }

    if (this.fleeRange > 0 && this.angularDistanceTo(player.theta, player.phi) < this.fleeRange) {
      this._fleeFrom(player.theta, player.phi); return
    }

    if (this.aggression < 2 && allEnemies) {
      const fleeR = this.aggression === 0 ? 0.22 : 0.15
      for (const o of allEnemies) {
        if (o === this || o._isDead) continue
        if (this.angularDistanceTo(o.theta, o.phi) < fleeR && o.body.length > myLen + 2) {
          this._fleeFrom(o.theta, o.phi); return
        }
      }
    }

    if (allEnemies) {
      const thresh = this.aggression === 2 ? Infinity : myLen - 2
      let best = null, bestD = Infinity
      for (const o of allEnemies) {
        if (o === this || o._isDead || o.body.length >= thresh) continue
        const d = this.angularDistanceTo(o.theta, o.phi)
        if (d < this.huntRange && d < bestD) { bestD = d; best = o }
      }
      if (best) { this._targetTheta = best.theta; this._targetPhi = best.phi; return }
    }

    const foods = this.scene3d.foodManager?.foods || []
    let bestFood = null, bestFD = Infinity
    for (const f of foods) {
      const d = this.angularDistanceTo(f.theta, f.phi)
      if (d < bestFD) { bestFD = d; bestFood = f }
    }
    if (bestFood && bestFD < 1.2) { this._targetTheta = bestFood.theta; this._targetPhi = bestFood.phi; return }

    const wobble = this.aggression === 2 ? 0.12 : 0.05
    this._wanderAngle += (Math.random() - 0.5) * wobble * 2
    this._targetTheta = null; this._targetPhi = null
    this.moveAngle = this._wanderAngle
  }

  _fleeFrom(theta2, phi2) {
    const n1 = this.surfaceNormal(this.theta, this.phi)
    const n2 = new THREE.Vector3(Math.sin(theta2) * Math.cos(phi2), Math.cos(theta2), Math.sin(theta2) * Math.sin(phi2))
    const away = n1.clone().sub(n2).normalize()
    const worldUp = new THREE.Vector3(0, 1, 0)
    let tx = new THREE.Vector3().crossVectors(worldUp, n1).normalize()
    if (tx.lengthSq() < 0.001) tx.set(1, 0, 0)
    const ty = new THREE.Vector3().crossVectors(n1, tx).normalize()
    this.moveAngle = Math.atan2(away.dot(ty), away.dot(tx))
    this._targetTheta = null; this._targetPhi = null
  }

  _steer(dt) {
    if (this._targetTheta === null) return
    const n = this.surfaceNormal(this.theta, this.phi)
    const t3 = new THREE.Vector3(Math.sin(this._targetTheta) * Math.cos(this._targetPhi), Math.cos(this._targetTheta), Math.sin(this._targetTheta) * Math.sin(this._targetPhi))
    const toT = t3.clone().sub(n); toT.addScaledVector(n, -toT.dot(n))
    if (toT.lengthSq() < 0.001) return
    const worldUp = new THREE.Vector3(0, 1, 0)
    let tx = new THREE.Vector3().crossVectors(worldUp, n).normalize()
    if (tx.lengthSq() < 0.001) tx.set(1, 0, 0)
    const ty = new THREE.Vector3().crossVectors(n, tx).normalize()
    const desired = Math.atan2(toT.dot(ty), toT.dot(tx))
    let diff = desired - this.moveAngle
    while (diff >  Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this.moveAngle += Math.max(-this.turnSpeed * dt, Math.min(this.turnSpeed * dt, diff))
  }

  _updateLabel() {
    if (!this._label || !this.scene3d.camera || !this.scene3d.renderer) return
    const v = this.headMesh.position.clone().project(this.scene3d.camera)
    const el = this.scene3d.renderer.domElement
    if (v.z > 1) { this._label.style.display = "none"; return }
    this._label.style.display = ""
    this._label.style.left = ((v.x * 0.5 + 0.5) * el.clientWidth)  + "px"
    this._label.style.top  = ((v.y * -0.5 + 0.5) * el.clientHeight) + "px"
  }

  destroy() {
    super.destroy()
    this._label?.remove()
  }
}
