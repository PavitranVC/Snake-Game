import { useEffect, useRef, useCallback } from "react"
import Phaser from "phaser"
import MenuScene from "../game/MenuScene.js"
import UIScene from "../game/UIScene.js"
import LevelCompleteScene from "../game/LevelCompleteScene.js"
import PlanetScene from "../game/PlanetScene.js"

export default function GameCanvas() {
  const wrapperRef  = useRef(null)
  const threeRef    = useRef(null)
  const phaserRef   = useRef(null)
  const phaserGame  = useRef(null)
  const planetScene = useRef(null)

  const destroyPlanet = useCallback(() => {
    if (planetScene.current) {
      planetScene.current.destroy()
      planetScene.current = null
    }
    const hud = document.getElementById("planet-hud")
    if (hud) hud.innerHTML = ""
  }, [])

  const startPlanet = useCallback((levelId) => {
    destroyPlanet()
    if (!threeRef.current || !phaserGame.current) return
    const ps = new PlanetScene(threeRef.current, levelId, phaserGame.current)
    planetScene.current = ps
    ps.start()
  }, [destroyPlanet])

  useEffect(() => {
    const game = new Phaser.Game({
      type:   Phaser.CANVAS,
      canvas: phaserRef.current,
      scale: {
        mode:       Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:  1280,
        height: 720,
      },
      backgroundColor: "transparent",
      transparent: true,
      physics: { default: "arcade", arcade: { debug: false } },
      scene: [MenuScene, UIScene, LevelCompleteScene],
    })
    phaserGame.current = game

    game.events.on("startPlanetLevel", (levelId) => {
      game.scene.start("UIScene", { levelId })
      startPlanet(levelId)
    })

    const onRestart = (e) => {
      destroyPlanet()
      const { levelId } = e.detail
      game.scene.stop("UIScene")
      setTimeout(() => {
        game.scene.start("UIScene", { levelId })
        startPlanet(levelId)
      }, 50)
    }

    const onTogglePause = () => {
      if (planetScene.current) planetScene.current._paused = !planetScene.current._paused
    }

    window.addEventListener("planet-restart",      onRestart)
    window.addEventListener("planet-toggle-pause", onTogglePause)

    return () => {
      window.removeEventListener("planet-restart",      onRestart)
      window.removeEventListener("planet-toggle-pause", onTogglePause)
      destroyPlanet()
      game.destroy(true)
    }
  }, [startPlanet, destroyPlanet])

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#020408" }}
    >
      <canvas
        ref={threeRef}
        id="three-canvas"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
      />
      <div
        id="planet-hud"
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}
      />
      <canvas
        ref={phaserRef}
        id="phaser-canvas"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2, background: "transparent" }}
      />
    </div>
  )
}
