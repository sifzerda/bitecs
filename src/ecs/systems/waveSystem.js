// src/ecs/systems/waveSystem.js

import { removeEntity } from "bitecs"

import { world } from "../constants/world.js"

import {
  Position,
  BossAI,
} from "../constants/components.js"

import {
  bossQuery,
  playerQuery,
} from "../constants/queries.js"

import {
  useGameStore,
  SCREEN,
} from "../../../store/gameStore.js"

import {
  getProgression,
} from "../constants/progression.js"

import { startState } from "../../state/startState.js"

import {
  spawnAsteroid,
  spawnBoss,
} from "../spawn.js"

import {
  activeAsteroids,
  releaseAsteroidEntity,
} from "../pools/asteroidPool.js"

import {
  beginEncounterClear,
} from "./encounterSystem.js"

const SPAWN_RADIUS = 16
const BOSS_SPAWN_DISTANCE = 10
const BOSS_ENTRANCE_DELAY = 1.5

let encounterSpawned = false

function spawnAsteroidWave(count) {
  startState.asteroidsRemaining = 0

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2

    const id = spawnAsteroid(
      Math.cos(angle) * SPAWN_RADIUS,
      Math.sin(angle) * SPAWN_RADIUS
    )

    if (id !== -1) {
      startState.asteroidsRemaining++
    }
  }

  if (startState.asteroidsRemaining === 0) {
    console.error(
      "[waveSystem] No asteroids could be spawned."
    )

    beginEncounterClear()
  }
}

function spawnBossEncounter(key) {
  const id = spawnBoss(key)

  if (id == null || id === -1) {
    console.error(
      "[waveSystem] Boss could not be spawned:",
      key
    )

    beginEncounterClear()
    return
  }

  const pid = playerQuery()[0]

  const playerX = pid === undefined ? 0 : Position.x[pid]
  const playerY = pid === undefined ? 0 : Position.y[pid]

  // Choose the opposite side of the arena.
  // Replace these coordinates with your arena bounds
  // if your playable area is smaller than this.
  Position.x[id] = playerX >= 0 ? -BOSS_SPAWN_DISTANCE : BOSS_SPAWN_DISTANCE

  Position.y[id] = playerY >= 0 ? -3 : 3

  BossAI.shootTimer[id] = BOSS_ENTRANCE_DELAY

  // Existing ECS field, reused for entrance protection.
  BossAI.decisionCooldown[id] = BOSS_ENTRANCE_DELAY
}

export function waveSystem() {
  const state = useGameStore.getState()

  if (state.screen !== SCREEN.PLAY || state.paused || encounterSpawned || startState.encounterPhase !== "idle") {
    return
  }

  // Wait for Home's player-spawn effect.
  if (playerQuery().length === 0) return

  if (activeAsteroids.length > 0 || bossQuery().length > 0) {
    return
  }

  const progression = getProgression(state.level)

  if (!progression.isBoss) {
    const count = progression.config?.asteroidCount

    if (!Number.isInteger(count) || count <= 0) {
      console.error("[waveSystem] Invalid asteroid count:", count)

      return
    }
  }

  encounterSpawned = true
  startState.encounterPhase = "active"

  if (progression.isBoss) {
    spawnBossEncounter(progression.boss)
  } else {
    spawnAsteroidWave(progression.config.asteroidCount)
  }
}

export function skipWave() {
  if (!import.meta.env.DEV) return

  while (activeAsteroids.length > 0) {
    releaseAsteroidEntity(activeAsteroids[activeAsteroids.length - 1])
  }

  for (const id of [...bossQuery()]) {
    removeEntity(world, id)
  }

  startState.asteroidsRemaining = 0
  startState.encounterPhase = "completed"

  useGameStore.getState().completeLevel()
}

export function resetWaveSystem() {
  encounterSpawned = false
}