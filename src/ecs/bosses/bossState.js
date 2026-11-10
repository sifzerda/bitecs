// src/ecs/bosses/bossState.js

import { bossLaserState } from "../weapons/weaponState/bossLaserState.js"
import { bossThrowerState } from "../weapons/weaponState/bossThrowerState.js"

export const bossFightState = {
  eid: -1,
  type: -1,
  weaponId: -1,

  phase: "entrance",
  combatPhase: 1,
  timer: 0,

  aim: 0,
  lockedAngle: 0,

  shots: 0,
  shotTimer: 0,
  cycles: 0,

  orbitDirection: 1,
  basePattern: null,
  pattern: null,
  movementStrategy: "orbit",

  warning: false,
  frozen: false,

  originX: 0,
  originY: 0,
  dirX: 0,
  dirY: 1,

  range: 10,
  coneAngle: 0,
  width: 24,
  height: 14,
  gap: 0,
}

export function clearBossWeapons() {
  bossLaserState.active = false
  bossLaserState.beamCount = 0
  bossLaserState.hitLegacy = false
  bossLaserState.hit.fill(0)

  bossThrowerState.active = false
}

export function resetBossAI() {
  const s = bossFightState

  // Preserve arena dimensions.
  const { width, height } = s

  Object.assign(s, {
    eid: -1,
    type: -1,
    weaponId: -1,

    phase: "entrance",
    combatPhase: 1,
    timer: 0,

    aim: 0,
    lockedAngle: 0,

    shots: 0,
    shotTimer: 0,
    cycles: 0,

    orbitDirection: 1,
    basePattern: null,
    pattern: null,
    movementStrategy: "orbit",

    warning: false,
    frozen: false,

    originX: 0,
    originY: 0,
    dirX: 0,
    dirY: 1,

    range: 10,
    coneAngle: 0,
    gap: 0,

    width,
    height,
  })

  clearBossWeapons()
}

export function setBossArenaSize(width, height) {
  if (width > 0 && height > 0) {
    bossFightState.width = width
    bossFightState.height = height
  }
}
