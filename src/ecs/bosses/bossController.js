// src/ecs/bosses/bossController.js

import { world } from "../constants/world.js"

import {
  Position,
  Rotation,
  Health,
  StatusEffect,
  BossAI,
  BossType,
} from "../constants/components.js"

import {
  bossAIQuery,
  playerQuery,
} from "../constants/queries.js"

import { BOSSES } from "../constants/bosses.js"
import { getWeapon } from "../weapons/config/weapons.js"

import {
  getBossCombatPhase,
  resolveBossPattern,
} from "./bossPhases.js"

import {
  getBossMovementStrategy,
  steerBoss,
} from "./bossMovement.js"

import {
  aimAtPlayer,
  rotateToward,
  lockBossAim,
  updateBossTelegraph,
} from "./bossTelegraphs.js"

import { executeBossAttack } from "./bossAttacks.js"

import {
  bossFightState,
  resetBossAI,
  clearBossWeapons,
} from "./bossState.js"

import { startState } from "../../state/startState.js"
import {
  useGameStore,
  SCREEN,
} from "../../../store/gameStore.js"

// ============================================================
// BASE CONFIGURATION
// ============================================================

const BASE = {
  range: 8,
  speed: 4.2,
  orbit: 2.3,
  warning: 0.85,
  attack: 0.8,
  recover: 1.4,
  shots: 2,
  gap: 0.28,
  turn: 2.6,
  lead: 0.2,
  sweep: 0,
}

export const BOSS_PATTERNS = {
  shotgun: {
    range: 6,
    warning: 0.8,
    shots: 2,
    gap: 0.4,
    attack: 0.65,
    recover: 1.4,
  },

  machinegun: {
    range: 8,
    warning: 0.8,
    shots: 6,
    gap: 0.12,
    attack: 0.8,
    recover: 1.5,
    sweep: 0.24,
  },

  cryogun: {
    range: 3.8,
    speed: 3.8,
    warning: 0.9,
    attack: 1,
    recover: 1.5,
    lead: 0,
  },

  grenadegun: {
    range: 8,
    warning: 0.95,
    shots: 2,
    gap: 0.55,
    attack: 0.8,
    recover: 1.6,
    lead: 0.35,
  },

  acidthrowergun: {
    range: 3.8,
    speed: 4,
    warning: 0.9,
    attack: 1,
    recover: 1.5,
    lead: 0,
  },

  missilegun: {
    range: 9,
    warning: 1,
    shots: 1,
    attack: 0.35,
    recover: 1.8,
    lead: 0,
  },

  flamethrowergun: {
    range: 4.3,
    speed: 4,
    warning: 1,
    attack: 1.1,
    recover: 1.6,
    lead: 0,
  },

  lasergun: {
    range: 10,
    warning: 1.15,
    attack: 0.85,
    recover: 1.7,
    lead: 0,
  },

  arcgun: {
    range: 8,
    warning: 1,
    attack: 0.7,
    recover: 1.7,
    lead: 0,
  },

  plasmagun: {
    range: 10,
    warning: 1.1,
    attack: 1,
    recover: 1.6,
    lead: 0,
  },
}

// ============================================================
// STATE TRANSITIONS
// ============================================================

function enterState(state, phase, id) {
  state.phase = phase
  state.timer = 0

  if (phase === "attack") {
    lockBossAim(state, id)

    state.shots = 0
    state.shotTimer = 0
  }

  if (phase === "recover") {
    state.cycles++
    state.orbitDirection *= -1
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

function initializeBoss(
  state,
  id,
  type,
  weaponId,
  boss
) {
  resetBossAI()

  state.eid = id
  state.type = type
  state.weaponId = weaponId

  state.basePattern = {
    ...BASE,
    ...BOSS_PATTERNS[boss?.key],
    ...boss?.ai,
  }

  state.combatPhase = getBossCombatPhase(
    Health.current[id],
    Health.max[id]
  )

  state.pattern = resolveBossPattern(
    state.basePattern,
    state.combatPhase
  )

  state.movementStrategy =
    getBossMovementStrategy(boss?.key)

  state.orbitDirection =
    type % 2 ? 1 : -1
}

function updateCombatPhase(state, id) {
  const nextPhase = getBossCombatPhase(
    Health.current[id],
    Health.max[id]
  )

  if (nextPhase === state.combatPhase) {
    return
  }

  state.combatPhase = nextPhase

  state.pattern = resolveBossPattern(
    state.basePattern,
    nextPhase
  )
}

// ============================================================
// COMBAT STATE MACHINE
// ============================================================

function updateCombatState({
  id,
  playerId,
  weapon,
  state,
  dt,
  distance,
}) {
  const p = state.pattern

  switch (state.phase) {
    case "entrance": {
      if (
        state.timer >= 1.5 &&
        BossAI.decisionCooldown[id] <= 0
      ) {
        enterState(state, "approach", id)
      }

      break
    }

    case "approach": {
      Rotation[id] = rotateToward(
        Rotation[id],
        aimAtPlayer(id, playerId, 0),
        p.turn * dt
      )

      const reach =
        weapon.category === "bullet"
          ? (weapon.speed ?? 10) *
            (weapon.lifetime ?? 1)
          : weapon.range ?? p.range

      if (
        state.timer >= 0.65 &&
        distance <= Math.min(
          p.range + 2,
          reach + 0.5
        )
      ) {
        state.aim = aimAtPlayer(
          id,
          playerId,
          p.lead
        )

        enterState(state, "warning", id)
      }

      break
    }

    case "warning": {
      Rotation[id] = rotateToward(
        Rotation[id],
        state.aim,
        p.turn * dt
      )

      if (state.timer >= p.warning) {
        enterState(state, "attack", id)
      }

      break
    }

    case "attack": {
      Rotation[id] = state.lockedAngle

      BossAI.beamActive[id] = 1

      executeBossAttack({
        id,
        playerId,
        weapon,
        state,
        dt,
      })

      if (state.timer >= p.attack) {
        enterState(state, "recover", id)

        clearBossWeapons()
        BossAI.beamActive[id] = 0
      }

      break
    }

    case "recover": {
      if (state.timer >= p.recover) {
        enterState(state, "approach", id)
      }

      break
    }

    default:
      enterState(state, "approach", id)
  }
}

// ============================================================
// MAIN CONTROLLER
// ============================================================

export function updateBossController() {
  clearBossWeapons()

  const game = useGameStore.getState()
  const state = bossFightState

  if (
    game.screen !== SCREEN.PLAY ||
    game.paused ||
    startState.encounterPhase !== "active"
  ) {
    state.warning = false
    return
  }

  // The Octopus and Eldritch bosses use specialized systems.
  const id = bossAIQuery().find((eid) => {
    const boss = BOSSES[BossType.typeIndex[eid]]

    return boss?.isShip !== false
  })

  const playerId = playerQuery()[0]

  if (id === undefined || playerId === undefined) {
    resetBossAI()
    return
  }

  const type = BossType.typeIndex[id]
  const weaponId = BossAI.weapon[id]

  const boss = BOSSES[type]
  const weapon = getWeapon(weaponId)

  if (
    !weapon ||
    Health.current[id] <= 0 ||
    Health.current[playerId] <= 0
  ) {
    state.warning = false
    return
  }

  if (
    state.eid !== id ||
    state.type !== type ||
    state.weaponId !== weaponId
  ) {
    initializeBoss(
      state,
      id,
      type,
      weaponId,
      boss
    )
  }

  updateCombatPhase(state, id)

  const dt = Math.min(
    Math.max(world.time.delta, 0),
    0.05
  )

  const p = state.pattern

  state.warning = false
  state.frozen = StatusEffect.frozen[id] > 0

  BossAI.beamActive[id] = 0

  if (state.frozen || dt <= 0) {
    return
  }

  BossAI.decisionCooldown[id] = Math.max(
    0,
    BossAI.decisionCooldown[id] - dt
  )

  state.timer += dt

  const distance = steerBoss({
    id,
    playerId,
    pattern: p,
    state,
    dt,
    strategy: state.movementStrategy,
  })

  updateCombatState({
    id,
    playerId,
    weapon,
    state,
    dt,
    distance,
  })

  updateBossTelegraph(
    state,
    id,
    weapon
  )

  BossAI.targetRotation[id] = state.aim

  BossAI.state[id] =
    state.phase === "attack"
      ? 0
      : state.phase === "recover"
        ? 1
        : 2
}
