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
    this._isDying     = false
    // UI sync cache — avoids pushing HUD updates every frame when nothing changed
    this._lastScore = -1
    this._lastLen   = -1
    this._lastKills = -1
    this._lastBoost = -1

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
    if (this._isDying) return

    const ph  = this.snake.head
    const phx = ph.x, phy = ph.y
    const HIT_HEAD = 26   // head vs head  (13 + 13)
    const HIT_BODY = 23   // head vs body  (13 + 10)
    const HIT_SQ_HEAD = HIT_HEAD * HIT_HEAD
    const HIT_SQ_BODY = HIT_BODY * HIT_BODY

    const enemies = this.enemyManager.enemies

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i]
      if (enemy._isDead) continue

      const ehx = enemy.head.x, ehy = enemy.head.y

      // ── Player vs this enemy ──────────────────────────────────────────
      const dxPE = phx - ehx, dyPE = phy - ehy
      const distSqPE = dxPE * dxPE + dyPE * dyPE

      // Broad-phase: skip if heads are far apart (600px covers longest snake body)
      if (distSqPE < 600 * 600) {
        // Player head hits enemy head
        if (distSqPE < HIT_SQ_HEAD) { this._playerDie(); return }

        // Player head hits enemy body
        for (const part of enemy.getBodyParts()) {
          const dx = phx - part.x, dy = phy - part.y
          if (dx * dx + dy * dy < HIT_SQ_BODY) { this._playerDie(); return }
        }

        // Enemy head hits player body
        for (const part of this.snake.getBodyParts()) {
          const dx = ehx - part.x, dy = ehy - part.y
          if (dx * dx + dy * dy < HIT_SQ_BODY) {
            this._enemyDie(enemy, true)  // player caused this kill
            break
          }
        }
      }

      if (enemy._isDead) continue  // may have just died above

      // ── This enemy vs every OTHER enemy ──────────────────────────────
      // Only check pairs where j > i to avoid checking the same pair twice
      for (let j = i + 1; j < enemies.length; j++) {
        const other = enemies[j]
        if (other._isDead) continue

        const ohx = other.head.x, ohy = other.head.y
        const dxEO = ehx - ohx, dyEO = ehy - ohy

        // Broad-phase between the two enemy heads
        if (dxEO * dxEO + dyEO * dyEO > 600 * 600) continue

        // Enemy i head hits enemy j body
        let iHitJ = false
        for (const part of other.getBodyParts()) {
          const dx = ehx - part.x, dy = ehy - part.y
          if (dx * dx + dy * dy < HIT_SQ_BODY) { iHitJ = true; break }
        }

        // Enemy j head hits enemy i body
        let jHitI = false
        if (!iHitJ) {  // only need to check other direction if i didn't already win
          for (const part of enemy.getBodyParts()) {
            const dx = ohx - part.x, dy = ohy - part.y
            if (dx * dx + dy * dy < HIT_SQ_BODY) { jHitI = true; break }
          }
        }

        // Head-on collision — both heads meet: shorter snake loses, or random on tie
        const headOnSq = dxEO * dxEO + dyEO * dyEO
        if (headOnSq < HIT_SQ_HEAD) {
          // Longer snake wins; equal length = random
          if (enemy.body.length >= other.body.length) {
            this._enemyDie(other)
          } else {
            this._enemyDie(enemy)
          }
          break  // one death per pair per frame
        }

        if (iHitJ) { this._enemyDie(enemy); break }
        if (jHitI) { this._enemyDie(other) }
      }
    }
  }

  _playerDie() {
    if (this._isDying) return   // prevent double-fire on same frame
    this._isDying = true

    this.particleManager.deathEffect(this.snake.head.x, this.snake.head.y)
    this._spawnDeathFood(this.snake)
    const finalScore = this.sessionScore
    const finalKills = this.sessionKills
    const finalLen   = this.snake.body.length + 1

    this.events.emit("playerDied", { score: finalScore, kills: finalKills, length: finalLen })

    this.time.delayedCall(600, () => {
      this.scene.stop("UIScene")
      this.scene.start("SnakeScene")
    })
  }

  _enemyDie(enemy, byPlayer = false) {
    if (enemy._isDead) return   // guard against double-kill same frame
    enemy._isDead = true

    // Only reward the player if THEY caused the kill
    if (byPlayer) {
      this.sessionScore += 200
      this.sessionKills++
    }

    // Explosion visual always plays, but camera shake only for player kills
    this.particleManager.killExplosion(enemy.head.x, enemy.head.y, enemy.colorHex, byPlayer)
    this._spawnDeathFood(enemy)
    enemy.destroy()
    this.enemyManager.removeEnemy(enemy)
    this.time.delayedCall(3000, () => this.enemyManager.spawnEnemy())
  }

  _spawnDeathFood(snake) {
    // Calculate total "value" the snake was worth:
    // each body segment = 1 point, same as eating tier-0 food.
    // We consolidate that value into at most MAX_DROPS high-tier items
    // so loot stays consistent regardless of snake length, but
    // a longer snake still drops visibly richer food (higher tiers).
    const MAX_DROPS = 30
    const segCount  = snake.body.length + 1          // +1 for head
    const totalVal  = segCount                        // 1 point per segment

    // How many items to spawn — scales with length but never exceeds MAX_DROPS
    const dropCount = Math.min(MAX_DROPS, Math.max(6, Math.ceil(segCount / 3)))

    // Each item's value share — determines which tier to force
    const valPerDrop = totalVal / dropCount

    // Map value-per-drop to the highest tier that fits
    // Tier points: 0→1, 1→2, 2→3, 3→5
    const tierForValue = (v) => {
      if (v >= 5) return 3
      if (v >= 3) return 2
      if (v >= 2) return 1
      return 0
    }
    const tier = tierForValue(valPerDrop)

    // Scatter drops across the snake's body positions — sample evenly
    const parts = snake.body
    const step  = Math.max(1, Math.floor(parts.length / dropCount))

    // Always drop one near the head
    this.foodManager.spawnFood(
      snake.head.x + Phaser.Math.Between(-25, 25),
      snake.head.y + Phaser.Math.Between(-25, 25),
      tier
    )

    // Remaining drops spread along the body
    let dropped = 1
    for (let i = 0; i < parts.length && dropped < dropCount; i += step) {
      const part = parts[i]
      this.foodManager.spawnFood(
        part.x + Phaser.Math.Between(-25, 25),
        part.y + Phaser.Math.Between(-25, 25),
        tier
      )
      dropped++
    }
  }

  _syncUI() {
    if (!this.uiScene?.setStats) return
    const len   = this.snake.body.length + 1
    const boost = Math.floor(this.snake.boostEnergy)
    // Only push to UIScene when a value has actually changed — avoids
    // triggering canvas redraws on the HUD every single frame
    if (
      this._lastScore !== this.sessionScore ||
      this._lastLen   !== len               ||
      this._lastKills !== this.sessionKills ||
      this._lastBoost !== boost
    ) {
      this._lastScore = this.sessionScore
      this._lastLen   = len
      this._lastKills = this.sessionKills
      this._lastBoost = boost
      this.uiScene.setStats({ score: this.sessionScore, length: len, kills: this.sessionKills, boost: this.snake.boostEnergy })
    }
  }
}
