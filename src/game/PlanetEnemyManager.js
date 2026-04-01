import PlanetEnemySnake from "./PlanetEnemySnake.js"

export default class PlanetEnemyManager {
  constructor(scene3d, cfg) {
    this.scene3d = scene3d
    this.cfg     = cfg
    this.enemies = []
    const count  = cfg.maxEnemies ?? 8
    for (let i = 0; i < count; i++) this.spawnEnemy(i)
  }

  spawnEnemy(colorIndex = null) {
    const ci    = colorIndex !== null ? colorIndex : this.enemies.length
    const theta = Math.acos(1 - 2 * Math.random())
    const phi   = Math.random() * Math.PI * 2
    const enemy = new PlanetEnemySnake(this.scene3d, theta, phi, ci, this.cfg)
    this.enemies.push(enemy)
    return enemy
  }

  update(playerSnake, dt) {
    for (const e of this.enemies) {
      if (!e._isDead) e.update(playerSnake, this.enemies, dt)
    }
  }

  removeEnemy(enemy) {
    this.enemies = this.enemies.filter(e => e !== enemy)
  }

  destroy() {
    for (const e of this.enemies) e.destroy()
    this.enemies = []
  }
}
