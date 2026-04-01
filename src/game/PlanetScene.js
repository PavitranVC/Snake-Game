import * as THREE from "three"
import PlanetSnake from "./PlanetSnake.js"
import PlanetEnemyManager from "./PlanetEnemyManager.js"
import PlanetFoodManager from "./PlanetFoodManager.js"
import PlanetGenerator from "./PlanetGenerator.js"
import { getLevelConfig } from "./LevelConfig.js"
import { CAM_HEIGHT_FACTOR, CAM_BACK_FACTOR, CAM_LERP, BOOST_COOLDOWN_MS, POWERUP_TYPES, POWERUP_SPAWN_INTERVAL } from "./constants.js"

export default class PlanetScene {
  constructor(canvas, levelId, phaserGame) {
    this.canvas      = canvas
    this.levelId     = levelId
    this.phaserGame  = phaserGame
    this.cfg         = getLevelConfig(levelId)

    this._isDying    = false
    this._levelDone  = false
    this._paused     = false
    this._destroyed  = false
    this.sessionScore = 0
    this.sessionKills = 0

    this._lastScore  = -1
    this._lastLen    = -1
    this._lastKills  = -1
    this._lastBoost  = -1

    this._keys    = {}
    this._pointer = { x: 0, y: 0, rightDown: false }
    this._clock   = new THREE.Clock()
    this._raycaster = new THREE.Raycaster()

    this._setupRenderer()
    this._setupScene()
    this._setupManagers()
    this._setupCamera()
    this._setupInput()
    this._setupPowerupTimer()
  }

  // ─── Setup ────────────────────────────────────────────────────────────────

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.canvas.clientWidth || window.innerWidth, this.canvas.clientHeight || window.innerHeight)
    this.renderer.setClearColor(0x020408)
  }

  _setupScene() {
    this.threeScene = new THREE.Scene()
  }

  _setupManagers() {
    this.planetGenerator = new PlanetGenerator(this)
    this.foodManager     = new PlanetFoodManager(this)
    this.snake           = new PlanetSnake(this, Math.PI / 2, 0, this.cfg.planetRadius)
    this.enemyManager    = new PlanetEnemyManager(this, this.cfg)
    this.powerups        = []
  }

  _setupCamera() {
    const w = this.canvas.clientWidth  || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.camera = new THREE.PerspectiveCamera(65, w / h, 0.1, this.cfg.planetRadius * 30)
    this._camPos    = new THREE.Vector3()
    this._camLookAt = new THREE.Vector3()
    this._camInit   = false
  }

  _setupInput() {
    const c = this.canvas

    this._onMouseMove = (e) => { this._pointer.x = e.clientX; this._pointer.y = e.clientY; this._castMouseRay() }
    this._onMouseDown = (e) => { if (e.button === 2) this._pointer.rightDown = true  }
    this._onMouseUp   = (e) => { if (e.button === 2) this._pointer.rightDown = false }
    this._onContext   = (e) => e.preventDefault()
    this._onKeyDown   = (e) => { this._keys[e.code] = true }
    this._onKeyUp     = (e) => { this._keys[e.code] = false }
    this._onResize    = ()  => this._resize()

    c.addEventListener("mousemove",   this._onMouseMove)
    c.addEventListener("mousedown",   this._onMouseDown)
    c.addEventListener("mouseup",     this._onMouseUp)
    c.addEventListener("contextmenu", this._onContext)
    window.addEventListener("keydown",  this._onKeyDown)
    window.addEventListener("keyup",    this._onKeyUp)
    window.addEventListener("resize",   this._onResize)
  }

  _setupPowerupTimer() {
    this._powerupTimer = setInterval(() => {
      if (!this._isDying && !this._levelDone && !this._paused) this._spawnPowerup()
    }, POWERUP_SPAWN_INTERVAL)
    setTimeout(() => this._spawnPowerup(), 3000)
  }

  // ─── Main loop ────────────────────────────────────────────────────────────

  start() {
    this._animId = requestAnimationFrame(this._loop.bind(this))
  }

  _loop() {
    if (this._destroyed) return
    this._animId = requestAnimationFrame(this._loop.bind(this))

    const rawDelta = this._clock.getDelta()
    const delta    = Math.min(rawDelta * 1000, 100)   // ms, capped
    const dt       = delta / 1000                      // seconds

    if (!this._paused && !this._isDying && !this._levelDone) {
      const boostDown = this._keys["Space"] || this._keys["ShiftLeft"] || this._pointer.rightDown
      this.snake.setBoostDown(boostDown)
      this.snake.update(delta)
      this.foodManager.update(dt)
      this.enemyManager.update(this.snake, dt)
      this._checkFoodCollision()
      this._checkPowerupCollision()
      this._handleCombat()
      this._syncUI()
    }

    this._updateCamera(dt)
    this.renderer.render(this.threeScene, this.camera)
  }

  // ─── Camera ───────────────────────────────────────────────────────────────

  _updateCamera(dt) {
    const R      = this.cfg.planetRadius
    const headPos = this.snake.headMesh.position.clone()
    const normal  = headPos.clone().normalize()

    const worldUp = new THREE.Vector3(0, 1, 0)
    let tx = new THREE.Vector3().crossVectors(worldUp, normal).normalize()
    if (tx.lengthSq() < 0.001) tx.set(1, 0, 0)
    const ty  = new THREE.Vector3().crossVectors(normal, tx).normalize()
    const fwd = new THREE.Vector3()
      .addScaledVector(tx, Math.cos(this.snake.moveAngle))
      .addScaledVector(ty, Math.sin(this.snake.moveAngle))
      .normalize()

    const camTarget  = headPos.clone().addScaledVector(fwd, -R * CAM_BACK_FACTOR).addScaledVector(normal, R * CAM_HEIGHT_FACTOR)
    const lookTarget = headPos.clone().addScaledVector(fwd, R * 0.06)

    if (!this._camInit) {
      this._camPos.copy(camTarget)
      this._camLookAt.copy(lookTarget)
      this._camInit = true
    } else {
      const t = Math.min(1, CAM_LERP / (dt || 0.016) * 0.016)
      this._camPos.lerp(camTarget, t)
      this._camLookAt.lerp(lookTarget, t)
    }

    this.camera.position.copy(this._camPos)
    this.camera.lookAt(this._camLookAt)
    this.camera.updateMatrixWorld()
  }

  // ─── Mouse ray ────────────────────────────────────────────────────────────

  _castMouseRay() {
    const rect = this.canvas.getBoundingClientRect()
    const ndcX = ((this._pointer.x - rect.left) / rect.width)  * 2 - 1
    const ndcY = -((this._pointer.y - rect.top)  / rect.height) * 2 + 1
    this._raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera)
    const sphere = new THREE.Sphere(new THREE.Vector3(), this.cfg.planetRadius)
    const target = new THREE.Vector3()
    const hit    = this._raycaster.ray.intersectSphere(sphere, target)
    this.snake.setMouseTarget(hit ? target : null)
  }

  // ─── Food collision ───────────────────────────────────────────────────────

  _checkFoodCollision() {
    for (const food of [...this.foodManager.foods]) {
      if (this.snake.angularDistanceTo(food.theta, food.phi) < 0.035) {
        this.snake.grow()
        this.sessionScore += food.points * 10
        this._flashPoint(food.mesh.position, 0x39ff14, 0.25)
        this.foodManager.removeFood(food)
      }
    }
  }

  // ─── Powerups ─────────────────────────────────────────────────────────────

  _spawnPowerup() {
    if (this.powerups.length >= 3) return
    const type  = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
    const R     = this.cfg.planetRadius
    const theta = Math.acos(1 - 2 * Math.random())
    const phi   = Math.random() * Math.PI * 2
    const size  = R * 0.025
    const geo   = new THREE.SphereGeometry(size, 10, 10)
    const mat   = new THREE.MeshPhongMaterial({ color: type.color, emissive: type.color, emissiveIntensity: 1 })
    const mesh  = new THREE.Mesh(geo, mat)
    const n     = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi))
    mesh.position.copy(n.multiplyScalar(R + size * 2))
    this.threeScene.add(mesh)
    const pu = { mesh, theta, phi, typeId: type.id, type, born: Date.now() }
    this.powerups.push(pu)
    setTimeout(() => this._removePowerup(pu), 12000)
  }

  _removePowerup(pu) {
    this.threeScene.remove(pu.mesh)
    pu.mesh.geometry.dispose()
    this.powerups = this.powerups.filter(p => p !== pu)
  }

  _checkPowerupCollision() {
    for (const pu of [...this.powerups]) {
      if (this.snake.angularDistanceTo(pu.theta, pu.phi) < 0.045) {
        this.snake.applyPowerup(pu.typeId)
        this._flashPoint(pu.mesh.position, pu.type.color, 0.3)
        const ui = this._getUI()
        if (ui) { ui.flashPowerup(pu.type); ui.showPowerup(pu.type) }
        this._removePowerup(pu)
      }
    }
  }

  // ─── Combat ───────────────────────────────────────────────────────────────

  _handleCombat() {
    if (this._isDying || this._levelDone) return

    const HIT_HEAD = 0.025
    const HIT_BODY = 0.020
    const playerLen = this.snake.body.length
    const enemies   = this.enemyManager.enemies

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i]
      if (e._isDead) continue

      const dPE = this.snake.angularDistanceTo(e.theta, e.phi)
      if (dPE < Math.PI * 0.5) {
        if (dPE < HIT_HEAD) {
          playerLen >= e.body.length ? this._enemyDie(e, true) : this._playerDie()
          return
        }
        for (const seg of e.body) {
          if (this._angDist3D(this.snake.headMesh.position, seg.position) < HIT_BODY) { this._playerDie(); return }
        }
        for (const seg of this.snake.body) {
          if (this._angDist3D(e.headMesh.position, seg.position) < HIT_BODY) { this._enemyDie(e, true); break }
        }
      }

      if (e._isDead) continue
      for (let j = i + 1; j < enemies.length; j++) {
        const o = enemies[j]
        if (o._isDead) continue
        const dEO = e.angularDistanceTo(o.theta, o.phi)
        if (dEO > Math.PI * 0.5) continue
        if (dEO < HIT_HEAD) { e.body.length >= o.body.length ? this._enemyDie(o) : this._enemyDie(e); break }
        let hit = false
        for (const seg of o.body) { if (this._angDist3D(e.headMesh.position, seg.position) < HIT_BODY) { this._enemyDie(e); hit = true; break } }
        if (!hit) for (const seg of e.body) { if (this._angDist3D(o.headMesh.position, seg.position) < HIT_BODY) { this._enemyDie(o); break } }
      }
    }
  }

  _angDist3D(p1, p2) {
    const R   = this.cfg.planetRadius
    const dot = p1.dot(p2) / (R * R)
    return Math.acos(Math.max(-1, Math.min(1, dot)))
  }

  // ─── Deaths & win ─────────────────────────────────────────────────────────

  _playerDie() {
    if (this._isDying || this._levelDone) return
    this._isDying = true
    this._flashPoint(this.snake.headMesh.position, 0xff2d78, 0.6)
    this._cameraShake(0.5)
    this._spawnDeathFood(this.snake)
    const data = { score: this.sessionScore, kills: this.sessionKills, length: this.snake.body.length + 1, levelId: this.levelId }
    this._getUI()?._showDeathScreen?.(data)
    setTimeout(() => {
      this.destroy()
      window.dispatchEvent(new CustomEvent("planet-restart", { detail: { levelId: this.levelId } }))
    }, 700)
  }

  _enemyDie(enemy, byPlayer = false) {
    if (enemy._isDead) return
    enemy._isDead = true
    if (byPlayer) {
      this.sessionScore += 200
      this.sessionKills++
      this._getUI()?.addKill?.(enemy.snakeName)
      if (this.sessionKills >= this.cfg.killTarget && !this._levelDone) { this._levelComplete(); return }
    }
    this._flashPoint(enemy.headMesh.position, enemy.colorHex, byPlayer ? 0.4 : 0.2)
    if (byPlayer) this._cameraShake(0.2)
    this._spawnDeathFood(enemy)
    enemy.destroy()
    this.enemyManager.removeEnemy(enemy)
    setTimeout(() => { if (!this._levelDone && !this._isDying) this.enemyManager.spawnEnemy() }, 3000)
  }

  _levelComplete() {
    this._levelDone = true
    this.renderer.setClearColor(0xffffff)
    setTimeout(() => this.renderer.setClearColor(0x020408), 300)
    setTimeout(() => {
      const pg = this.phaserGame
      const data = { levelId: this.levelId, score: this.sessionScore, kills: this.sessionKills, length: this.snake?.body.length + 1 || 1 }
      this.destroy()
      pg.scene.stop("UIScene")
      pg.scene.start("LevelCompleteScene", data)
    }, 800)
  }

  _spawnDeathFood(snake) {
    const drops = Math.min(20, Math.max(4, Math.ceil(snake.body.length / 3)))
    const tier  = snake.body.length > 15 ? 3 : snake.body.length > 8 ? 2 : snake.body.length > 4 ? 1 : 0
    for (let i = 0; i < drops; i++) {
      this.foodManager.spawnFood(
        snake.theta + (Math.random() - 0.5) * 0.1,
        snake.phi   + (Math.random() - 0.5) * 0.1,
        tier
      )
    }
  }

  // ─── Visual fx ────────────────────────────────────────────────────────────

  _flashPoint(position, color, duration = 0.3) {
    const R     = this.cfg.planetRadius
    const light = new THREE.PointLight(color, 8, R * 0.6)
    light.position.copy(position)
    this.threeScene.add(light)
    setTimeout(() => this.threeScene.remove(light), duration * 1000)
  }

  _cameraShake(duration) {
    const start = performance.now()
    const intensity = this.cfg.planetRadius * 0.008
    const tick = () => {
      if (this._destroyed) return
      const t = (performance.now() - start) / (duration * 1000)
      if (t > 1) return
      const d = 1 - t
      this.camera.position.x += (Math.random() - 0.5) * intensity * d
      this.camera.position.y += (Math.random() - 0.5) * intensity * d
      requestAnimationFrame(tick)
    }
    tick()
  }

  // ─── UI sync ──────────────────────────────────────────────────────────────

  _syncUI() {
    const ui = this._getUI()
    if (!ui?.setStats) return
    const len   = this.snake.body.length + 1
    const boost = Math.floor(this.snake.boostEnergy)
    if (this._lastScore === this.sessionScore && this._lastLen === len && this._lastKills === this.sessionKills && this._lastBoost === boost) return
    this._lastScore = this.sessionScore; this._lastLen = len; this._lastKills = this.sessionKills; this._lastBoost = boost
    ui.setStats({
      score:         this.sessionScore,
      length:        len,
      kills:         this.sessionKills,
      killTarget:    this.cfg.killTarget,
      boost:         this.snake.boostEnergy,
      boostMax:      this.snake.boostMax,
      onCooldown:    this.snake._boostOnCooldown,
      cooldownPct:   this.snake._boostCooldownMs > 0 ? this.snake._boostCooldownMs / BOOST_COOLDOWN_MS : 0,
      activePowerup: this.snake.activePowerup,
      levelId:       this.levelId,
      levelColor:    this.cfg.color,
      worldSize:     this.cfg.worldSize,
      playerTheta:   this.snake.theta,
      playerPhi:     this.snake.phi,
      enemyPositions: this.enemyManager.enemies.map(e => ({ theta: e.theta, phi: e.phi, colorHex: e.colorHex })),
    })
  }

  _getUI() { return this.phaserGame?.scene?.get("UIScene") }

  // ─── Resize ───────────────────────────────────────────────────────────────

  _resize() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  destroy() {
    if (this._destroyed) return
    this._destroyed = true
    clearInterval(this._powerupTimer)
    cancelAnimationFrame(this._animId)

    const c = this.canvas
    c.removeEventListener("mousemove",   this._onMouseMove)
    c.removeEventListener("mousedown",   this._onMouseDown)
    c.removeEventListener("mouseup",     this._onMouseUp)
    c.removeEventListener("contextmenu", this._onContext)
    window.removeEventListener("keydown",  this._onKeyDown)
    window.removeEventListener("keyup",    this._onKeyUp)
    window.removeEventListener("resize",   this._onResize)

    for (const pu of this.powerups) { this.threeScene.remove(pu.mesh); pu.mesh.geometry.dispose() }
    this.snake?.destroy()
    this.foodManager?.destroy()
    this.enemyManager?.destroy()
    this.renderer.dispose()
  }
}
