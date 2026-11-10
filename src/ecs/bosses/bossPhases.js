// src/ecs/bosses/bossPhases.js

export const BOSS_COMBAT_PHASE = Object.freeze({
  ONE: 1,
  TWO: 2,
  THREE: 3,
})

const DEFAULT_THRESHOLDS = [0.7, 0.35]

export function getBossCombatPhase(currentHealth, maxHealth, thresholds = DEFAULT_THRESHOLDS ) {
  if (!(maxHealth > 0)) {
    return BOSS_COMBAT_PHASE.ONE
  }

  const ratio = Math.max(0, Math.min(1, currentHealth / maxHealth))

  if (ratio <= thresholds[1]) {
    return BOSS_COMBAT_PHASE.THREE
  }

  if (ratio <= thresholds[0]) {
    return BOSS_COMBAT_PHASE.TWO
  }

  return BOSS_COMBAT_PHASE.ONE
}

export function getPhaseModifiers(phase) {
  switch (phase) {
    case BOSS_COMBAT_PHASE.TWO:
      return {
        speed: 1.12,
        warning: 0.9,
        attack: 1.1,
        recover: 0.85,
        shots: 1,
      }

    case BOSS_COMBAT_PHASE.THREE:
      return {
        speed: 1.25,
        warning: 0.8,
        attack: 1.2,
        recover: 0.7,
        shots: 2,
      }

    default:
      return {
        speed: 1,
        warning: 1,
        attack: 1,
        recover: 1,
        shots: 0,
      }
  }
}

export function resolveBossPattern(basePattern, phase) {
  const modifiers = getPhaseModifiers(phase)

  return {
    ...basePattern,
    speed: basePattern.speed * modifiers.speed,
    warning: basePattern.warning * modifiers.warning,
    attack: basePattern.attack * modifiers.attack,
    recover: basePattern.recover * modifiers.recover,
    shots: basePattern.shots + modifiers.shots,
  }
}
