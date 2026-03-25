import Phaser from "phaser"
import EnemySnake from "./EnemySnake"
import { MAX_ENEMIES, WORLD_SIZE } from "./constants"

export default class EnemyManager {
  constructor(scene) {
    this.scene   = scene
    this.enemies = []
    this._spawnInitial()
  }

  _spawnInitial() {
    for (let i = 0; i < MAX_ENEMIES; i++) this.spawnEnemy(i)
  }

  spawnEnemy(colorIndex = null) {
    const ci = colorIndex !== null ? colorIndex : this.enemies.length
    const margin = 400
    const x = Phaser.Math.Between(margin, WORLD_SIZE - margin)
    const y = Phaser.Math.Between(margin, WORLD_SIZE - margin)
    const enemy = new EnemySnake(this.scene, x, y, ci)
    this.enemies.push(enemy)
    // Register food overlap if foodManager is already available
    if (this.scene.foodManager) {
      this.scene.physics.add.overlap(
        enemy.head,
        this.scene.foodManager.group,
        (head, food) => {
          enemy.grow()
          food.destroy()
        }
      )
    }
    return enemy
  }

  // Called from SnakeScene after foodManager is ready
  registerFoodOverlaps() {
    for (const enemy of this.enemies) {
      this.scene.physics.add.overlap(
        enemy.head,
        this.scene.foodManager.group,
        (head, food) => {
          enemy.grow()
          food.destroy()
        }
      )
    }
  }

  update(player) {
    for (const e of this.enemies) {
      e.update(this.scene.foodManager.group, player)
    }
  }

  removeEnemy(enemy) {
    this.enemies = this.enemies.filter(e => e !== enemy)
  }
}
