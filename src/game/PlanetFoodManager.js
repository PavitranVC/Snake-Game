import * as THREE from "three"
import { FOOD_TIERS } from "./constants.js"

export default class PlanetFoodManager {
  constructor(scene3d) {
    this.scene3d = scene3d
    this.foods   = []
    this._pulse  = 1.0
    this._pulseDir = 1
    for (let i = 0; i < 120; i++) this._spawnRandom()
  }

  _randomSpherical() {
    return {
      theta: Math.acos(1 - 2 * Math.random()),
      phi:   Math.random() * Math.PI * 2,
    }
  }

  _pickTier() {
    const r = Math.random()
    if (r < 0.55) return 0
    if (r < 0.80) return 1
    if (r < 0.93) return 2
    return 3
  }

  spawnFood(theta, phi, forceTier = null) {
    const ti   = forceTier !== null ? forceTier : this._pickTier()
    const tier = FOOD_TIERS[ti]
    const R    = this.scene3d.cfg.planetRadius
    const size = (tier.radius / 800) * R * 0.018

    const geo  = new THREE.SphereGeometry(size, 8, 8)
    const mat  = new THREE.MeshPhongMaterial({ color: tier.color, emissive: tier.color, emissiveIntensity: 0.9 })
    const mesh = new THREE.Mesh(geo, mat)

    const n = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi))
    mesh.position.copy(n.multiplyScalar(R + size * 1.5))
    this.scene3d.threeScene.add(mesh)

    const food = { mesh, theta, phi, tier: ti, points: tier.points }
    this.foods.push(food)
    return food
  }

  _spawnRandom() {
    const { theta, phi } = this._randomSpherical()
    this.spawnFood(theta, phi)
  }

  update(dt) {
    this._pulse += this._pulseDir * dt * 0.8
    if (this._pulse > 1.2) this._pulseDir = -1
    if (this._pulse < 1.0) this._pulseDir =  1
    for (const f of this.foods) f.mesh.scale.setScalar(this._pulse)
  }

  removeFood(food) {
    this.scene3d.threeScene.remove(food.mesh)
    food.mesh.geometry.dispose()
    this.foods = this.foods.filter(f => f !== food)
    this._spawnRandom()
  }

  destroy() {
    for (const f of this.foods) { this.scene3d.threeScene.remove(f.mesh); f.mesh.geometry.dispose() }
    this.foods = []
  }
}
