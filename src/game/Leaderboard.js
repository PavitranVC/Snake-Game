/**
 * Leaderboard.js — localStorage-backed score persistence.
 * Stores top 10 entries globally and per-level.
 * Each entry: { name, score, kills, length, levelId, levelName, date }
 */

const STORAGE_KEY    = "neon_snake_leaderboard"
const NAME_KEY       = "neon_snake_player_name"
const MAX_ENTRIES    = 10

export function getPlayerName() {
  return localStorage.getItem(NAME_KEY) || ""
}

export function setPlayerName(name) {
  localStorage.setItem(NAME_KEY, name.trim().slice(0, 12).toUpperCase())
}

export function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch {
    return []
  }
}

export function saveScore(entry) {
  // entry = { name, score, kills, length, levelId, levelName }
  const board = getLeaderboard()
  board.push({
    ...entry,
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
  })
  // Sort by score descending, keep top MAX_ENTRIES
  board.sort((a, b) => b.score - a.score)
  const trimmed = board.slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  // Return the rank of the new entry (1-based), or null if it didn't make it
  const rank = trimmed.findIndex(e =>
    e.name === entry.name &&
    e.score === entry.score &&
    e.date === trimmed[0]?.date
  )
  return rank === -1 ? null : rank + 1
}

export function clearLeaderboard() {
  localStorage.removeItem(STORAGE_KEY)
}
