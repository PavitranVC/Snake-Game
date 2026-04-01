import { useEffect, useRef } from "react"
import Phaser from "phaser"
import MenuScene from "../game/MenuScene"
import SnakeScene from "../game/SnakeScene"
import UIScene from "../game/UIScene"
import LevelCompleteScene from "../game/LevelCompleteScene"

export default function GameCanvas() {
  const ref = useRef(null)

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720,
      },
      backgroundColor: "#050a0f",
      physics: {
        default: "arcade",
        arcade: {
          debug:     false,
          fixedStep: true,
          fps:       60,
        },
      },
      // MenuScene is first so it loads as the start screen
      scene: [MenuScene, SnakeScene, UIScene, LevelCompleteScene],
    })
    return () => game.destroy(true)
  }, [])

  return (
    <div
      ref={ref}
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
    />
  )
}
