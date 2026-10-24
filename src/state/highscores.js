// src/state/highscores.js

const KEY = "asteroids.highscores.v1"

export function getHighscores() {

  try {
    
    const rows = JSON.parse(localStorage.getItem(KEY))

    return Array.isArray(rows) 
    ? rows.filter(row => row 
      && Number.isFinite(row.score) 
      && Number.isInteger(row.level) 
      && typeof row.id === "string").sort((a, b) => b.score - a.score).slice(0, 10) 
      : []
  
  } catch {
    return []
  }
}
export function recordHighscore({ id, score, level, outcome = "destroyed" }) {

  const rows = getHighscores()

  if (rows.some(row => row.id === id)) return true

  if (!Number.isFinite(score) || score <= 0) return true

  rows.push({
    id,
    score: Math.trunc(score),
    level, outcome,
    date: new Date().toISOString()
  })

  rows.sort((a, b) => b.score - a.score)

  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 10)));
    return true
  }
  catch {
    return false
  }
}
