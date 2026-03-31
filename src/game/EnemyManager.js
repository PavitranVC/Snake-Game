import Phaser from "phaser"
import EnemySnake from "./EnemySnake"
import { MAX_ENEMIES, WORLD_SIZE, BORDER_MARGIN } from "./constants"

export default class EnemyManager {
  constructor(scene) {
    this.scene   = scene
    this.enemies = []
    for (let i = 0; i < MAX_ENEMIES; i++) this.spawnEnemy(i)
  }

  spawnEnemy(colorIndex = null) {
    const ci = colorIndex !== null ? colorIndex : this.enemies.length
    const x = Phaser.Math.Between(BORDER_MARGIN, WORLD_SIZE - BORDER_MARGIN)
    const y = Phaser.Math.Between(BORDER_MARGIN, WORLD_SIZE - BORDER_MARGIN)
    const enemy = new EnemySnake(this.scene, x, y, ci)

    // Store the collider on the enemy so we can destroy it when the enemy dies.
    // Without this, every respawn adds a new collider that accumulates forever.
    enemy._foodCollider = this.scene.physics.add.overlap(
      enemy.head,
      this.scene.foodManager.group,
      (head, food) => { enemy.grow(); food.destroy() }
    )

    this.enemies.push(enemy)
    return enemy
  }

  // Called from SnakeScene after foodManager is initialised
  registerFoodOverlaps() {
    // Overlaps are registered inside spawnEnemy — kept as no-op for compatibility
  }

  update(player) {
    // Pass the full enemies list so each enemy can reason about others —
    // hunt smaller ones, flee bigger ones. No extra allocation: we pass
    // the same array reference that already exists.
    for (const e of this.enemies) {
      e.update(this.scene.foodManager.group, player, this.enemies)
    }
  }

  removeEnemy(enemy) {
    // Destroy the physics collider before removing the enemy — prevents leak
    if (enemy._foodCollider) {
      this.scene.physics.world.removeCollider(enemy._foodCollider)
      enemy._foodCollider = null
    }
    this.enemies = this.enemies.filter(e => e !== enemy)
  }
}
