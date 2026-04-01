import Phaser from "phaser"
import Snake from "./Snake"
import FoodManager from "./FoodManager"
import WorldGenerator from "./WorldGenerator"
import EnemyManager from "./EnemyManager"
import ParticleManager from "./ParticleManager"
import PowerupManager from "./PowerupManager"
import AnimalManager from "./AnimalManager"
import { getLevelConfig } from "./LevelConfig"
import { PLAYER_COLOR, BOOST_COOLDOWN_MS } from "./constants"

export default class SnakeScene extends Phaser.Scene {
  constructor() {
    super({ key: "SnakeScene" })
  }

  init(data) {
    this.levelId = data?.levelId ?? 1
  }

  create() {
    this.cfg = getLevelConfig(this.levelId)
    const { worldSize, borderMargin } = this.cfg

    this.physics.world.setBounds(0, 0, worldSize, worldSize)

    // Managers — order matters
    this.particleManager = new ParticleManager(this)
    this.foodManager     = new FoodManager(this)
    this.worldGenerator  = new WorldGenerator(this, this.foodManager, this.cfg)
    this.snake           = new Snake(this, worldSize / 2, worldSize / 2)
    this.enemyManager    = new EnemyManager(this, this.cfg)
    this.powerupManager  = new PowerupManager(this, this.snake, this.cfg) // FIX #4: pass cfg
    this.animalManager   = new AnimalManager(this)                        // FIX #6: instantiate critters

    this.enemyManager.registerFoodOverlaps()

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
    this._levelDone   = false
    this._lastScore   = -1
    this._lastLen     = -1
    this._lastKills   = -1
    this._lastBoost   = -1

    // Launch HUD with level context
    this.scene.launch("UIScene", { levelId: this.levelId })
    this.uiScene = this.scene.get("UIScene")

    // Forward powerup events
    this.events.on("powerupCollected", (type) => {
      if (this.uiScene?.flashPowerup) this.uiScene.flashPowerup(type)
      if (this.uiScene?.showPowerup)  this.uiScene.showPowerup(type)  // FIX #5: also trigger banner
    })
  }

  update(time, delta) {
    if (this._isDying || this._levelDone) return
    this.snake.update(delta)
    this.worldGenerator.update(this.snake.head.x, this.snake.head.y)
    this.enemyManager.update(this.snake.head)
    this.animalManager.update(this.snake.head)  // FIX #6: tick critters
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
    if (this._isDying || this._levelDone) return

    const ph  = this.snake.head
    const phx = ph.x, phy = ph.y
    const HIT_HEAD    = 26
    const HIT_BODY    = 23
    const HIT_SQ_HEAD = HIT_HEAD * HIT_HEAD
    const HIT_SQ_BODY = HIT_BODY * HIT_BODY
    const enemies     = this.enemyManager.enemies
    const playerLen   = this.snake.body.length

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i]
      if (enemy._isDead) continue

      const ehx = enemy.head.x, ehy = enemy.head.y
      const dxPE = phx - ehx, dyPE = phy - ehy
      const distSqPE = dxPE * dxPE + dyPE * dyPE

      if (distSqPE < 600 * 600) {
        // FIX #8: head-on collision — smaller snake dies; equal size = player dies
        if (distSqPE < HIT_SQ_HEAD) {
          if (playerLen >= enemy.body.length) {
            this._enemyDie(enemy, true)
          } else {
            this._playerDie()
          }
          return
        }

        // Player head hits enemy body → player dies
        for (const part of enemy.getBodyParts()) {
          const dx = phx - part.x, dy = phy - part.y
          if (dx * dx + dy * dy < HIT_SQ_BODY) { this._playerDie(); return }
        }

        // Enemy head hits player body → enemy dies
        for (const part of this.snake.getBodyParts()) {
          const dx = ehx - part.x, dy = ehy - part.y
          if (dx * dx + dy * dy < HIT_SQ_BODY) {
            this._enemyDie(enemy, true)
            break
          }
        }
      }

      if (enemy._isDead) continue

      // Enemy vs enemy combat
      for (let j = i + 1; j < enemies.length; j++) {
        const other = enemies[j]
        if (other._isDead) continue

        const ohx = other.head.x, ohy = other.head.y
        const dxEO = ehx - ohx, dyEO = ehy - ohy
        if (dxEO * dxEO + dyEO * dyEO > 600 * 600) continue

        let iHitJ = false
        for (const part of other.getBodyParts()) {
          const dx = ehx - part.x, dy = ehy - part.y
          if (dx * dx + dy * dy < HIT_SQ_BODY) { iHitJ = true; break }
        }

        let jHitI = false
        if (!iHitJ) {
          for (const part of enemy.getBodyParts()) {
            const dx = ohx - part.x, dy = ohy - part.y
            if (dx * dx + dy * dy < HIT_SQ_BODY) { jHitI = true; break }
          }
        }

        const headOnSq = dxEO * dxEO + dyEO * dyEO
        if (headOnSq < HIT_SQ_HEAD) {
          enemy.body.length >= other.body.length ? this._enemyDie(other) : this._enemyDie(enemy)
          break
        }
        if (iHitJ) { this._enemyDie(enemy); break }
        if (jHitI) this._enemyDie(other)
      }
    }
  }

  _playerDie() {
    if (this._isDying || this._levelDone) return
    this._isDying = true
    this.particleManager.deathEffect(this.snake.head.x, this.snake.head.y)
    this._spawnDeathFood(this.snake)
    this.events.emit("playerDied", {
      score:   this.sessionScore,
      kills:   this.sessionKills,
      length:  this.snake.body.length + 1,
      levelId: this.levelId,
    })
    this.time.delayedCall(600, () => {
      this.scene.stop("UIScene")
      this.scene.start("SnakeScene", { levelId: this.levelId })
    })
  }

  _enemyDie(enemy, byPlayer = false) {
    if (enemy._isDead) return
    enemy._isDead = true

    if (byPlayer) {
      this.sessionScore += 200
      this.sessionKills++

      // FIX #1: hook up the kill feed
      if (this.uiScene?.addKill) this.uiScene.addKill(enemy.snakeName)

      // Check win condition
      if (this.sessionKills >= this.cfg.killTarget && !this._levelDone) {
        this._levelComplete()
        return
      }
    }

    this.particleManager.killExplosion(enemy.head.x, enemy.head.y, enemy.colorHex, byPlayer)
    this._spawnDeathFood(enemy)
    enemy.destroy()
    this.enemyManager.removeEnemy(enemy)

    // FIX #7: don't respawn if level is already done
    this.time.delayedCall(3000, () => {
      if (!this._levelDone && !this._isDying) this.enemyManager.spawnEnemy()
    })
  }

  _levelComplete() {
    this._levelDone = true
    this.cameras.main.flash(400, 255, 255, 100)
    this.cameras.main.shake(300, 0.015)

    this.time.delayedCall(800, () => {
      this.scene.stop("UIScene")
      this.scene.start("LevelCompleteScene", {
        levelId: this.levelId,
        score:   this.sessionScore,
        kills:   this.sessionKills,
        length:  this.snake.body.length + 1,
      })
      this.scene.stop("SnakeScene")
    })
  }

  _spawnDeathFood(snake) {
    const MAX_DROPS  = 30
    const segCount   = snake.body.length + 1
    const dropCount  = Math.min(MAX_DROPS, Math.max(6, Math.ceil(segCount / 3)))
    const valPerDrop = segCount / dropCount
    const tier = valPerDrop >= 5 ? 3 : valPerDrop >= 3 ? 2 : valPerDrop >= 2 ? 1 : 0
    const parts = snake.body
    const step  = Math.max(1, Math.floor(parts.length / dropCount))

    this.foodManager.spawnFood(
      snake.head.x + Phaser.Math.Between(-25, 25),
      snake.head.y + Phaser.Math.Between(-25, 25), tier
    )
    let dropped = 1
    for (let i = 0; i < parts.length && dropped < dropCount; i += step) {
      this.foodManager.spawnFood(
        parts[i].x + Phaser.Math.Between(-25, 25),
        parts[i].y + Phaser.Math.Between(-25, 25), tier
      )
      dropped++
    }
  }

  _syncUI() {
    if (!this.uiScene?.setStats) return
    const len   = this.snake.body.length + 1
    const boost = Math.floor(this.snake.boostEnergy)
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
      this.uiScene.setStats({
        score:         this.sessionScore,
        length:        len,
        kills:         this.sessionKills,
        killTarget:    this.cfg.killTarget,
        boost:         this.snake.boostEnergy,
        boostMax:      this.snake.boostMax,
        onCooldown:    this.snake._boostOnCooldown,
        cooldownPct:   this.snake._boostCooldownMs > 0          // FIX #2: was `cooldown`, now matches UIScene read key
                         ? this.snake._boostCooldownMs / BOOST_COOLDOWN_MS : 0,
        activePowerup: this.snake.activePowerup,
        levelId:       this.levelId,
        levelColor:    this.cfg.color,
        worldSize:     this.cfg.worldSize,                       // FIX #3: pass level world size for minimap
      })
    }
  }
}
