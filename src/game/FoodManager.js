import Phaser from "phaser"
import { FOOD_TIERS } from "./constants"

export default class FoodManager {
  constructor(scene) {
    this.scene    = scene
    this.group    = scene.physics.add.group()
    this._pulse   = { scale: 1.0 }   // single shared value all food reads from
    this._buildTextures()
    this._buildSharedPulseTween()
  }

  // One tween drives ALL food orbs — instead of one tween per orb.
  // Each frame, spawnFood sets the food image's scale from this shared value.
  _buildSharedPulseTween() {
    this.scene.tweens.add({
      targets:  this._pulse,
      scale:    1.2,
      duration: 700,
      yoyo:     true,
      repeat:   -1,
      ease:     "Sine.easeInOut",
      onUpdate: () => {
        // Apply current pulse scale to every food orb in one pass
        for (const food of this.group.getChildren()) {
          food.setScale(this._pulse.scale)
        }
      },
    })
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

  spawnFood(x, y, forceTier = null) {
    const tierIndex = forceTier !== null ? forceTier : this._pickTier()
    const tier      = FOOD_TIERS[tierIndex]
    const key       = `food_${tierIndex}`

    const food = this.scene.add.image(x, y, key)
    food.setDepth(5)
    food.tierIndex = tierIndex
    food.points    = tier.points

    // Physics hitbox: use the inner glow radius (tier.radius * 1.4) so
    // collection feels responsive without being too generous.
    // The texture is size = radius * 6, centered at size/2.
    // Arcade circle offset must shift the circle so it sits at the image center:
    //   offset = (textureHalfSize) - circleRadius
    this.scene.physics.add.existing(food)
    const textureSize   = tier.radius * 6
    const hitRadius     = tier.radius * 1.4
    const centerOffset  = textureSize / 2 - hitRadius
    food.body.setCircle(hitRadius, centerOffset, centerOffset)

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
