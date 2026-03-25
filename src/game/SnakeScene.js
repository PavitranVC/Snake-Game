import Phaser from "phaser"
import Snake from "./Snake"
import FoodManager from "./FoodManager"
import WorldGenerator from "./WorldGenerator"
import EnemyManager from "./EnemyManager"
import ParticleManager from "./ParticleManager"
import { WORLD_SIZE, PLAYER_COLOR } from "./constants"

export default class SnakeScene extends Phaser.Scene {
  constructor() {
    super({ key: "SnakeScene" })
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)

    // Managers — foodManager must exist before enemyManager
    this.particleManager = new ParticleManager(this)
    this.foodManager     = new FoodManager(this)
    this.worldGenerator  = new WorldGenerator(this, this.foodManager)
    this.snake           = new Snake(this, WORLD_SIZE / 2, WORLD_SIZE / 2)
    this.enemyManager    = new EnemyManager(this)

    // Now that foodManager exists, wire up enemy-food overlaps
    this.enemyManager.registerFoodOverlaps()

    // Camera
    this.cameras.main.startFollow(this.snake.head, true, 0.08, 0.08)
    this.cameras.main.setZoom(1.0)

    // Player eats food
    this.physics.add.overlap(
      this.snake.head,
      this.foodManager.group,
      (head, food) => this._playerEatFood(food)
    )

    // Stats
    this.sessionScore = 0
    this.sessionKills = 0

    // Launch HUD (runs in parallel)
    this.scene.launch("UIScene", {
      score: 0,
      length: this.snake.body.length + 1,
      boostRef: this.snake,
      kills: 0,
    })

    this.uiScene = this.scene.get("UIScene")
  }

  update() {
    this.snake.update()
    this.worldGenerator.update(this.snake.head.x, this.snake.head.y)
    this.enemyManager.update(this.snake.head)
    this._handleCombat()
    this._syncUI()
  }

  _playerEatFood(food) {
    const pts = food.points || 1
    this.snake.grow()
    this.sessionScore += pts * 10
    this.particleManager.eatBurst(food.x, food.y, PLAYER_COLOR)
    food.destroy()
  }

  _handleCombat() {
    const ph = this.snake.head

    for (const enemy of [...this.enemyManager.enemies]) {
      // Broad-phase: skip entirely if enemy head is far from player
      const roughDist = Phaser.Math.Distance.Between(ph.x, ph.y, enemy.head.x, enemy.head.y)
      if (roughDist > 400) continue

      // Player head hits enemy head
      if (roughDist < 18) { this._playerDie(); return }

      // Player head hits enemy body
      for (const part of enemy.getBodyParts()) {
        const d = Phaser.Math.Distance.Between(ph.x, ph.y, part.x, part.y)
        if (d < 16) { this._playerDie(); return }
      }

      // Enemy head hits player body (only check nearest ~20 segments)
      const playerParts = this.snake.getBodyParts()
      const checkCount = Math.min(playerParts.length, 20)
      for (let i = 0; i < checkCount; i++) {
        const part = playerParts[i]
        const d = Phaser.Math.Distance.Between(enemy.head.x, enemy.head.y, part.x, part.y)
        if (d < 16) { this._enemyDie(enemy); break }
      }
    }
  }

  _playerDie() {
    this.particleManager.deathEffect(this.snake.head.x, this.snake.head.y)
    this._spawnDeathFood(this.snake)
    const finalScore = this.sessionScore
    const finalKills = this.sessionKills
    const finalLen   = this.snake.body.length + 1

    this.time.delayedCall(600, () => {
      this.scene.stop("UIScene")
      this.scene.start("SnakeScene")
      // Pass to a death screen or just restart
    })
    // Show death overlay via event
    this.events.emit("playerDied", { score: finalScore, kills: finalKills, length: finalLen })
  }

  _enemyDie(enemy) {
    this.sessionScore += 200
    this.sessionKills++
    this.particleManager.killExplosion(enemy.head.x, enemy.head.y, enemy.colorHex)
    this._spawnDeathFood(enemy)
    enemy.destroy()
    this.enemyManager.removeEnemy(enemy)
    // Respawn after delay
    this.time.delayedCall(3000, () => this.enemyManager.spawnEnemy())
  }

  _spawnDeathFood(snake) {
    const parts = [snake.head, ...snake.body]
    for (const part of parts) {
      for (let i = 0; i < 3; i++) {
        const x = part.x + Phaser.Math.Between(-20, 20)
        const y = part.y + Phaser.Math.Between(-20, 20)
        this.foodManager.spawnFood(x, y)
      }
    }
  }

  _syncUI() {
    if (this.uiScene && this.uiScene.update) {
      this.uiScene.setStats({
        score: this.sessionScore,
        length: this.snake.body.length + 1,
        kills: this.sessionKills,
        boost: this.snake.boostEnergy,
      })
    }
  }
}
