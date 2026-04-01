import * as THREE from "three"
import { HEAD_RADIUS, BODY_RADIUS, SNAKE_SURFACE_OFFSET } from "./constants.js"

export default class PlanetSnakeBase {
  constructor(scene3d, theta, phi, color, radius) {
    this.scene3d   = scene3d
    this.R         = radius
    this.color     = color
    this.theta     = theta
    this.phi       = phi
    this.moveAngle = Math.random() * Math.PI * 2
    this.body      = []

    this._HIST_CAP  = 2000
    this._histBuf   = new Float32Array(this._HIST_CAP * 2)
    this._histHead  = 0
    this._histCount = 0

    this._buildMeshes()
  }

  // ─── Sphere helpers ───────────────────────────────────────────────────────

  surfaceNormal(theta, phi) {
    return new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    )
  }

  aboveSurface(theta, phi, offset = SNAKE_SURFACE_OFFSET) {
    const n = this.surfaceNormal(theta, phi)
    return n.multiplyScalar(this.R + offset)
  }

  // ─── Mesh construction ────────────────────────────────────────────────────

  _segScale() { return this.R / 800 }

  _buildMeshes() {
    const scene = this.scene3d.threeScene
    const sc    = this._segScale()

    const headGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.012 * sc, 12, 12)
    const headMat = new THREE.MeshPhongMaterial({
      color: this.color, emissive: this.color, emissiveIntensity: 0.6, shininess: 80,
    })
    this.headMesh = new THREE.Mesh(headGeo, headMat)
    this.headMesh.position.copy(this.aboveSurface(this.theta, this.phi))
    scene.add(this.headMesh)

    const eyeGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.004 * sc, 6, 6)
    const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 })
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat)
    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat)
    scene.add(this.eyeL)
    scene.add(this.eyeR)

    for (let i = 0; i < 6; i++) this._addBodySegment()
  }

  _addBodySegment() {
    const scene = this.scene3d.threeScene
    const sc    = this._segScale()
    const geo   = new THREE.SphereGeometry(BODY_RADIUS * 0.010 * sc, 8, 8)
    const opacity = Math.max(0.3, 0.9 - this.body.length * 0.012)
    const mat   = new THREE.MeshPhongMaterial({
      color: this.color, emissive: this.color,
      emissiveIntensity: 0.3, shininess: 40,
      transparent: true, opacity,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(this.headMesh.position)
    scene.add(mesh)
    this.body.push(mesh)
    return mesh
  }

  // ─── History ring buffer ──────────────────────────────────────────────────

  _updateHistory() {
    const slot = this._histHead * 2
    this._histBuf[slot]     = this.theta
    this._histBuf[slot + 1] = this.phi
    this._histHead = (this._histHead + 1) % this._HIST_CAP
    if (this._histCount < this._HIST_CAP) this._histCount++
  }

  _historyAt(n) {
    if (n >= this._histCount) return null
    const idx  = (this._histHead - 1 - n + this._HIST_CAP) % this._HIST_CAP
    const slot = idx * 2
    return { theta: this._histBuf[slot], phi: this._histBuf[slot + 1] }
  }

  // ─── Per-frame updates ────────────────────────────────────────────────────

  _updateBodyMeshes() {
    const spacing = 55
    for (let i = 0; i < this.body.length; i++) {
      const pt = this._historyAt((i + 1) * spacing)
      if (!pt) continue
      this.body[i].position.copy(this.aboveSurface(pt.theta, pt.phi, SNAKE_SURFACE_OFFSET * 0.7))
    }
  }

  _updateEyes() {
    const n      = this.surfaceNormal(this.theta, this.phi)
    const worldUp = new THREE.Vector3(0, 1, 0)
    let fwd = new THREE.Vector3().crossVectors(worldUp, n).normalize()
    if (fwd.lengthSq() < 0.001) fwd.set(1, 0, 0)
    const right = new THREE.Vector3().crossVectors(n, fwd).normalize()
    const sc    = this._segScale()
    const off   = HEAD_RADIUS * 0.010 * sc
    const fwdOff = HEAD_RADIUS * 0.008 * sc
    const hp    = this.headMesh.position
    this.eyeL.position.copy(hp).addScaledVector(right,  off).addScaledVector(fwd, fwdOff).addScaledVector(n, off * 0.5)
    this.eyeR.position.copy(hp).addScaledVector(right, -off).addScaledVector(fwd, fwdOff).addScaledVector(n, off * 0.5)
  }

  // ─── Great-circle movement ────────────────────────────────────────────────

  _stepOnSphere(dAngle) {
    if (Math.abs(dAngle) < 1e-9) return
    const pos = this.surfaceNormal(this.theta, this.phi)

    const worldUp = new THREE.Vector3(0, 1, 0)
    let tx = new THREE.Vector3().crossVectors(worldUp, pos).normalize()
    if (tx.lengthSq() < 0.001) tx.set(1, 0, 0)
    const ty = new THREE.Vector3().crossVectors(pos, tx).normalize()

    const dir = new THREE.Vector3()
      .addScaledVector(tx, Math.cos(this.moveAngle))
      .addScaledVector(ty, Math.sin(this.moveAngle))
      .normalize()

    const axis    = new THREE.Vector3().crossVectors(pos, dir).normalize()
    const quat    = new THREE.Quaternion().setFromAxisAngle(axis, dAngle)
    const newPos  = pos.clone().applyQuaternion(quat).normalize()

    this.theta = Math.acos(Math.max(-1, Math.min(1, newPos.y)))
    this.phi   = Math.atan2(newPos.z, newPos.x)
    if (this.phi < 0) this.phi += Math.PI * 2

    this.headMesh.position.copy(this.aboveSurface(this.theta, this.phi))

    const newN = this.surfaceNormal(this.theta, this.phi)
    const m    = new THREE.Matrix4().lookAt(this.headMesh.position, this.headMesh.position.clone().add(dir), newN)
    this.headMesh.setRotationFromMatrix(m)
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get headPosition() { return this.headMesh.position }

  angularDistanceTo(theta2, phi2) {
    const n1  = this.surfaceNormal(this.theta, this.phi)
    const n2  = new THREE.Vector3(
      Math.sin(theta2) * Math.cos(phi2),
      Math.cos(theta2),
      Math.sin(theta2) * Math.sin(phi2)
    )
    return Math.acos(Math.max(-1, Math.min(1, n1.dot(n2))))
  }

  grow() { this._addBodySegment() }

  destroy() {
    const scene = this.scene3d.threeScene
    scene.remove(this.headMesh)
    scene.remove(this.eyeL)
    scene.remove(this.eyeR)
    this.body.forEach(m => { scene.remove(m); m.geometry.dispose() })
    this.headMesh.geometry.dispose()
  }
}
