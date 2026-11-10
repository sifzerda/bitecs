// src/ecs/difficulty/difficultyScaling.js

import {
  ZONE_DIFFICULTY,
  WAVE_DIFFICULTY,
  DIFFICULTY_LIMITS,
} from "./difficultyConfig.js"

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value))

export function getDifficultyProfile({
  zoneIndex = 0,
  waveIndex = 0,
  baseCount = 6,
} = {}) {
  const zone = clamp(Math.floor(zoneIndex), 0, ZONE_DIFFICULTY.length - 1)
  const wave = clamp(Math.floor(waveIndex), 0, WAVE_DIFFICULTY.length - 1)

  const z = ZONE_DIFFICULTY[zone]
  const w = WAVE_DIFFICULTY[wave]

  const densityMultiplier = z.density * w.density

  return {
    zoneIndex: zone,
    waveIndex: wave,

    count: clamp(Math.round(baseCount * densityMultiplier), 1, DIFFICULTY_LIMITS.maxInitialAsteroids),

    speedMultiplier: Math.min(DIFFICULTY_LIMITS.maxSpeedMultiplier, z.speed * w.speed),
    aggressionMultiplier: Math.min(DIFFICULTY_LIMITS.maxAggressionMultiplier, z.aggression * w.aggression),
    healthMultiplier: Math.min(DIFFICULTY_LIMITS.maxHealthMultiplier, 1 + zone * 0.01),
  }
}
