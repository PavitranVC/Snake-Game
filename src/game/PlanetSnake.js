import * as THREE from "three"
import PlanetSnakeBase from "./PlanetSnakeBase.js"
import {
  PLAYER_COLOR, ANGULAR_SPEED, ANGULAR_BOOST_SPEED,
  BOOST_DRAIN, BOOST_REGEN, BOOST_MAX, BOOST_COOLDOWN_MS,
} from "./constants.js"

export default class PlanetSnake extends PlanetSnakeBase {
  constructor(scene3d, theta, phi, radius) {
    super(scene3d, theta, phi, PLAYER_COLOR, radius)

    this.angularSpeed   = ANGULAR_SPEED
    this.angularBoost   = ANGULAR_BOOST_SPEED
    this.isBoosting     = false
    this.boostEnergy    = BOOST_MAX
    this.boostMax       = BOOST_MAX
    this._boostOnCooldown  = false
    this._boostCooldownMs  = 0
    this.regenMultiplier   = 1.0
    this._regenPowerupTimer = 0
    this._capPowerupTimer   = 0
    this._targetAngle   = null
    this._boostDown     = false

    this._buildTrail()
  }

  _buildTrail() {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(60 * 3)
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    this._trail = new THREE.Points(geo, new THREE.PointsMaterial({
      color: PLAYER_COLOR, size: 3.5, transparent: true, opacity: 0.55, sizeAttenuation: true,
    }))
    this._trail.frustumCulled = false
    this.scene3d.threeScene.add(this._trail)
    this._trailPts = []
  }

  _updateTrail() {
    if (!this.isBoosting) { this._trail.material.opacity = 0; return }
    this._trailPts.unshift(this.headMesh.position.clone())
    if (this._trailPts.length > 20) this._trailPts.pop()
    const attr = this._trail.geometry.attributes.position
    for (let i = 0; i < 20; i++) {
      const p = this._trailPts[i] || this.headMesh.position
      attr.setXYZ(i, p.x, p.y, p.z)
    }
    attr.needsUpdate = true
    this._trail.material.opacity = 0.55
  }

  update(delta) {
    const dt = delta / 1000
    this._steer(dt)
    const speed = (this.isBoosting && !this._boostOnCooldown) ? this.angularBoost : this.angularSpeed
    this._stepOnSphere(speed * dt)
    this._updateHistory()
    this._updateBodyMeshes()
    this._updateEyes()
    this._updateBoost(delta)
    this._tickPowerups(delta)
    this._updateTrail()
  }

  setMouseTarget(worldPoint) {
    if (!worldPoint) return
    const toTarget = worldPoint.clone().sub(this.headMesh.position)
    const n = this.surfaceNormal(this.theta, this.phi)
    toTarget.addScaledVector(n, -toTarget.dot(n))
    if (toTarget.lengthSq() < 0.001) return

    const worldUp = new THREE.Vector3(0, 1, 0)
    let tx = new THREE.Vector3().crossVectors(worldUp, n).normalize()
    if (tx.lengthSq() < 0.001) tx.set(1, 0, 0)
    const ty = new THREE.Vector3().crossVectors(n, tx).normalize()
    this._targetAngle = Math.atan2(toTarget.dot(ty), toTarget.dot(tx))
  }

  setBoostDown(v) { this._boostDown = v }

  _steer(dt) {
    if (this._targetAngle === null) return
    let diff = this._targetAngle - this.moveAngle
    while (diff >  Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    const maxTurn = 3.5 * dt
    this.moveAngle += Math.max(-maxTurn, Math.min(maxTurn, diff))
  }

  _updateBoost(delta) {
    this.isBoosting = this._boostDown && this.boostEnergy > 0 && !this._boostOnCooldown
    if (this.isBoosting) {
      this.boostEnergy = Math.max(0, this.boostEnergy - BOOST_DRAIN)
      if (this.boostEnergy === 0 && !this._boostOnCooldown) {
        this._boostOnCooldown = true
        this._boostCooldownMs = BOOST_COOLDOWN_MS
      }
    } else {
      if (this._boostOnCooldown) {
        this._boostCooldownMs -= delta
        if (this._boostCooldownMs <= 0) { this._boostOnCooldown = false; this._boostCooldownMs = 0 }
      } else {
        this.boostEnergy = Math.min(this.boostMax, this.boostEnergy + BOOST_REGEN * this.regenMultiplier)
      }
    }
  }

  applyPowerup(type) {
    if (type === "boost_refill") {
      this.boostEnergy = this.boostMax; this._boostOnCooldown = false; this._boostCooldownMs = 0
    } else if (type === "boost_regen") {
      this.regenMultiplier = 3.0; this._regenPowerupTimer = 10000
    } else if (type === "boost_capacity") {
      this.boostMax = BOOST_MAX + 50; this._capPowerupTimer = 15000
      this.boostEnergy = Math.min(this.boostEnergy + 50, this.boostMax)
    }
  }

  _tickPowerups(delta) {
    if (this._regenPowerupTimer > 0) {
      this._regenPowerupTimer -= delta
      if (this._regenPowerupTimer <= 0) this.regenMultiplier = 1.0
    }
    if (this._capPowerupTimer > 0) {
      this._capPowerupTimer -= delta
      if (this._capPowerupTimer <= 0) { this.boostMax = BOOST_MAX; this.boostEnergy = Math.min(this.boostEnergy, this.boostMax) }
    }
  }

  get activePowerup() {
    if (this._regenPowerupTimer > 0) return { id: "boost_regen",    msLeft: this._regenPowerupTimer }
    if (this._capPowerupTimer  > 0) return { id: "boost_capacity", msLeft: this._capPowerupTimer  }
    return null
  }

  destroy() {
    super.destroy()
    this.scene3d.threeScene.remove(this._trail)
    this._trail.geometry.dispose()
  }
}
