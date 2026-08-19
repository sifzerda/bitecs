// src/ecs/systems/waveSystem.js

import { removeEntity } from "bitecs"
import { world } from "../constants/world.js"
import {
  useGameStore,
  isBossLevel,
  getBossIndex,
  getWave,
} from "../../../store/gameStore.js"
import { simState } from "../../state/simState.js"
import { spawnAsteroid, spawnBoss } from "../spawn.js"
import { bossQuery } from "../constants/queries.js"
import { BOSSES } from "../constants/bosses.js"
import {
  activeAsteroids,
  releaseAsteroidEntity,
} from "../pools/asteroidPool.js"

const SPAWN_RADIUS = 16

const BOSS_ROSTER = BOSSES.filter((b) => b.key !== "player")

export function waveSystem() {
  if (simState.asteroidsRemaining > 0 || simState.bossAlive) {
    return
  }

  const level = useGameStore.getState().level

  // --------------------------------------------------------
  // Boss level
  // --------------------------------------------------------
  if (isBossLevel(level) && !simState.bossDone) {
    const bossIndex = getBossIndex(level) % BOSS_ROSTER.length
    const bossKey = BOSS_ROSTER[bossIndex].key

    spawnBoss(bossKey)
    simState.bossAlive = true
    simState.bossDone = true
    return
  }

  // --------------------------------------------------------
  // Asteroid level
  // --------------------------------------------------------
  if (isBossLevel(level)) {
    // Boss already handled (or done); nothing to spawn.
    return
  }

  const waveNum = getWave(level) // 1, 2, or 3
  const count = 4 + waveNum * 2
  simState.asteroidsRemaining = count

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    spawnAsteroid(
      Math.cos(angle) * SPAWN_RADIUS,
      Math.sin(angle) * SPAWN_RADIUS
    )
  }
}

export function skipWave() {
  for (let i = activeAsteroids.length - 1; i >= 0; i--) {
    releaseAsteroidEntity(activeAsteroids[i])
  }

  const bosses = bossQuery()

  for (let i = 0; i < bosses.length; i++) {
    removeEntity(world, bosses[i])
  }

  simState.asteroidsRemaining = 0
  simState.bossAlive = false

  useGameStore.getState().advanceWave()
}