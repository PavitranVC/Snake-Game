import { PLANET_RADIUS_L1, PLANET_RADIUS_L2, PLANET_RADIUS_L3 } from "./constants.js"

export const LEVELS = [
  {
    id:           1,
    name:         "THE NURSERY",
    subtitle:     "Learn or die trying",
    color:        "#39ff14",
    colorHex:     0x39ff14,
    worldSize:    4000,
    borderMargin: 120,
    planetRadius: PLANET_RADIUS_L1,
    killTarget:   5,
    objectiveText: "Kill 5 enemy snakes to advance",
    maxEnemies:   8,
    enemySpeedMin: 90,
    enemySpeedMax: 130,
    aggression:   0,
    fleeRange:    250,
    huntRange:    200,
    fleePlayerAlways:     false,
    targetPlayerDirectly: false,
    traits: ["8 enemy snakes", "Passive AI — mostly flees", "5 kills to complete", "Large planet"],
  },
  {
    id:           2,
    name:         "THE ARENA",
    subtitle:     "Only the hungry survive",
    color:        "#ffe600",
    colorHex:     0xffe600,
    worldSize:    2800,
    borderMargin: 120,
    planetRadius: PLANET_RADIUS_L2,
    killTarget:   10,
    objectiveText: "Kill 10 enemy snakes to advance",
    maxEnemies:   12,
    enemySpeedMin: 130,
    enemySpeedMax: 185,
    aggression:   1,
    fleeRange:    120,
    huntRange:    400,
    fleePlayerAlways:     false,
    targetPlayerDirectly: false,
    traits: ["12 enemy snakes", "Balanced AI — hunts & flees", "10 kills to complete", "Medium planet"],
  },
  {
    id:           3,
    name:         "THE PIT",
    subtitle:     "Everyone wants you dead",
    color:        "#ff2d78",
    colorHex:     0xff2d78,
    worldSize:    1800,
    borderMargin: 100,
    planetRadius: PLANET_RADIUS_L3,
    killTarget:   15,
    objectiveText: "Kill 15 enemy snakes to escape",
    maxEnemies:   15,
    enemySpeedMin: 185,
    enemySpeedMax: 240,
    aggression:   2,
    fleeRange:    0,
    huntRange:    9999,
    fleePlayerAlways:     false,
    targetPlayerDirectly: true,
    traits: ["15 enemy snakes", "Aggressive AI — hunts the player", "15 kills to complete", "Cramped planet"],
  },
]

export const LEVEL_STORAGE_KEY = "neon_snake_unlocked_level"

export function getUnlockedLevel() {
  return parseInt(localStorage.getItem(LEVEL_STORAGE_KEY) || "1", 10)
}

export function unlockLevel(levelId) {
  const current = getUnlockedLevel()
  if (levelId > current) localStorage.setItem(LEVEL_STORAGE_KEY, String(levelId))
}

export function getLevelConfig(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0]
}
