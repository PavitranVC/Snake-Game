import Phaser from "phaser"
import { WORLD_SIZE, BORDER_MARGIN } from "./constants"

const CRITTER_COLORS = [0xfacc15, 0xfb923c, 0xa78bfa, 0x34d399]

export default class AnimalManager {
  constructor(scene) {
    this.scene = scene
    this.group = scene.physics.add.group()
    this._buildTexture()
    this._spawnCritters(18)
  }

  _buildTexture() {
    if (this.scene.textures.exists("critter")) return
    const g = this.scene.add.graphics()
    g.fillStyle(0xfacc15, 1)
    g.fillCircle(7, 7, 7)
    g.fillStyle(0xffffff, 0.5)
    g.fillCircle(5, 5, 2.5)
    g.generateTexture("critter", 14, 14)
    g.destroy()
  }

  _spawnCritters(count) {
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(BORDER_MARGIN, WORLD_SIZE - BORDER_MARGIN)
      const y = Phaser.Math.Between(BORDER_MARGIN, WORLD_SIZE - BORDER_MARGIN)
      const c = this.scene.add.image(x, y, "critter")
      c.setDepth(6)
      c.setTint(Phaser.Math.RND.pick(CRITTER_COLORS))
      this.scene.physics.add.existing(c)
      c.body.setVelocity(
        Phaser.Math.Between(-60, 60),
        Phaser.Math.Between(-60, 60)
      )
      c.body.setBounce(1)
      c.body.setCollideWorldBounds(true)
      this.group.add(c)
    }
  }

  update(snakeHead) {
    // Critters scatter from snake
    this.group.getChildren().forEach(c => {
      const d = Phaser.Math.Distance.Between(c.x, c.y, snakeHead.x, snakeHead.y)
      if (d < 120) {
        const angle = Phaser.Math.Angle.Between(snakeHead.x, snakeHead.y, c.x, c.y)
        c.body.setVelocity(
          Math.cos(angle) * 200,
          Math.sin(angle) * 200
        )
      }
    })
  }
}
