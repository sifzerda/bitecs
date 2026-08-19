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

const BOSS_ROSTER = BOSSES.filter(
  (boss) => boss.key !== "player"
)

export function waveSystem() {
  // Asteroids are still active
  if (simState.asteroidsRemaining > 0) {
    return
  }

  // Boss entity is still active
  if (bossQuery().length > 0) {
    return
  }

  const level = useGameStore.getState().level

  // --------------------------------------------------------
  // Boss level
  // --------------------------------------------------------

  if (isBossLevel(level)) {
    if (simState.bossDone) {
      return
    }

    const bossIndex =
      getBossIndex(level) % BOSS_ROSTER.length

    spawnBoss(BOSS_ROSTER[bossIndex].key)

    simState.bossDone = true

    return
  }

  // --------------------------------------------------------
  // Asteroid level
  // --------------------------------------------------------

  const wave = getWave(level)
  const count = 4 + wave * 2

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

  for (const id of bossQuery()) {
    removeEntity(world, id)
  }

  simState.asteroidsRemaining = 0

  useGameStore.getState().advanceWave()
}