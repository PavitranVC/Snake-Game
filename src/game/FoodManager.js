import Phaser from "phaser"
import { FOOD_TIERS } from "./constants"

export default class FoodManager {
  constructor(scene) {
    this.scene = scene
    this.group = scene.physics.add.group()
    this._buildTextures()
  }

  _buildTextures() {
    // Pre-render one texture per tier
    FOOD_TIERS.forEach((tier, i) => {
      const key = `food_${i}`
      if (this.scene.textures.exists(key)) return
      const r = tier.radius
      const size = r * 6
      const g = this.scene.add.graphics()
      // Outermost glow
      g.fillStyle(tier.color, 0.08)
      g.fillCircle(size / 2, size / 2, r * 2.8)
      // Mid glow
      g.fillStyle(tier.color, 0.2)
      g.fillCircle(size / 2, size / 2, r * 2.0)
      // Inner glow
      g.fillStyle(tier.color, 0.5)
      g.fillCircle(size / 2, size / 2, r * 1.4)
      // Core
      g.fillStyle(tier.color, 1)
      g.fillCircle(size / 2, size / 2, r)
      // Specular
      g.fillStyle(0xffffff, 0.7)
      g.fillCircle(size / 2 - r * 0.3, size / 2 - r * 0.3, r * 0.3)
      g.generateTexture(key, size, size)
      g.destroy()
    })
  }

  spawnFood(x, y) {
    const tierIndex = this._pickTier()
    const tier = FOOD_TIERS[tierIndex]
    const key = `food_${tierIndex}`

    const food = this.scene.add.image(x, y, key)
    food.setDepth(5)
    food.tierIndex = tierIndex
    food.points = tier.points

    // Pulse tween
    this.scene.tweens.add({
      targets: food,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 600 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 500,
    })

    this.scene.physics.add.existing(food)
    food.body.setCircle(tier.radius * 3, 0, 0)
    this.group.add(food)
    return food
  }

  _pickTier() {
    const roll = Math.random()
    if (roll < 0.55) return 0
    if (roll < 0.80) return 1
    if (roll < 0.93) return 2
    return 3
  }
}
