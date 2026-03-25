import { useEffect, useRef } from "react"
import Phaser from "phaser"
import SnakeScene from "../game/SnakeScene"
import UIScene from "../game/UIScene"

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
          debug: false,
          fixedStep: true,   // deterministic fixed timestep — no speed variance at different fps
          fps: 60,
        },
      },
      scene: [SnakeScene, UIScene],
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
