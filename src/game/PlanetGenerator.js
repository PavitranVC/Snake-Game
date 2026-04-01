import * as THREE from "three"

export default class PlanetGenerator {
  constructor(scene3d) {
    this.scene3d = scene3d
    this._build()
  }

  _build() {
    const scene = this.scene3d.threeScene
    const R     = this.scene3d.cfg.planetRadius
    const color = this.scene3d.cfg.colorHex

    // Planet sphere
    const planetMat = new THREE.MeshPhongMaterial({ color: 0x061a30, emissive: 0x020810, shininess: 12, specular: 0x112244 })
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), planetMat))

    // Grid lines
    const gridMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18 })
    const LINES   = 18
    for (let i = 0; i <= LINES; i++) {
      const t  = (i / LINES) * Math.PI
      const pts = []
      for (let j = 0; j <= 64; j++) {
        const p = (j / 64) * Math.PI * 2
        pts.push(new THREE.Vector3(R * Math.sin(t) * Math.cos(p), R * Math.cos(t), R * Math.sin(t) * Math.sin(p)))
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat))
    }
    for (let i = 0; i < LINES; i++) {
      const p  = (i / LINES) * Math.PI * 2
      const pts = []
      for (let j = 0; j <= 64; j++) {
        const t = (j / 64) * Math.PI
        pts.push(new THREE.Vector3(R * Math.sin(t) * Math.cos(p), R * Math.cos(t), R * Math.sin(t) * Math.sin(p)))
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat))
    }

    // Atmosphere
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.04, 32, 32),
      new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.06, side: THREE.BackSide })
    ))

    // Equator ring
    scene.add(new THREE.Mesh(
      new THREE.TorusGeometry(R * 1.005, R * 0.003, 8, 128),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    ))

    // Starfield
    const starCount = 1800
    const starPos   = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = R * (6 + Math.random() * 8)
      const t = Math.acos(1 - 2 * Math.random())
      const p = Math.random() * Math.PI * 2
      starPos[i * 3]     = r * Math.sin(t) * Math.cos(p)
      starPos[i * 3 + 1] = r * Math.cos(t)
      starPos[i * 3 + 2] = r * Math.sin(t) * Math.sin(p)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: R * 0.006, sizeAttenuation: true, transparent: true, opacity: 0.85 })))

    // Lighting
    scene.add(new THREE.AmbientLight(0x111133, 0.8))
    const sun = new THREE.DirectionalLight(0xffffff, 1.4)
    sun.position.set(R * 3, R * 2, R * 1.5)
    scene.add(sun)
    const fill = new THREE.PointLight(color, 0.6, R * 6)
    fill.position.set(-R * 2, R, -R)
    scene.add(fill)
  }
}
