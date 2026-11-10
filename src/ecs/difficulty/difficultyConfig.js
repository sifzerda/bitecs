// src/ecs/difficulty/difficultyConfig.js

import { ASTEROID_TYPE as T } from "../asteroids/asteroidTypes.js"

export const ZONE_DIFFICULTY = Object.freeze([
  { unlocks: [T.NORMAL], density: 1.00, speed: 1.00, aggression: 1.00 },
  { unlocks: [T.HEAVY], density: 1.05, speed: 1.03, aggression: 1.05 },
  { unlocks: [T.FAST], density: 1.10, speed: 1.06, aggression: 1.10 },
  { unlocks: [T.ERRATIC], density: 1.15, speed: 1.09, aggression: 1.15 },
  { unlocks: [T.SPLITTER], density: 1.20, speed: 1.12, aggression: 1.20 },
  { unlocks: [T.HUNTER], density: 1.25, speed: 1.15, aggression: 1.25 },
  { unlocks: [], density: 1.30, speed: 1.18, aggression: 1.32 },
  { unlocks: [], density: 1.35, speed: 1.21, aggression: 1.39 },
  { unlocks: [], density: 1.40, speed: 1.24, aggression: 1.46 },
  { unlocks: [], density: 1.45, speed: 1.27, aggression: 1.53 },
  { unlocks: [], density: 1.50, speed: 1.30, aggression: 1.60 },
  { unlocks: [], density: 1.55, speed: 1.33, aggression: 1.67 },
])

export const WAVE_DIFFICULTY = Object.freeze([
  { density: 1, speed: 1, aggression: 1 },
  { density: 1.10, speed: 1.02, aggression: 1.05 },
  { density: 1.20, speed: 1.04, aggression: 1.10 },
])

export const DIFFICULTY_LIMITS = Object.freeze({
  maxInitialAsteroids: 64,
  maxSpeedMultiplier: 1.5,
  maxAggressionMultiplier: 2,
  maxHealthMultiplier: 1.15,
})
