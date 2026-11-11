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
// CONFIGURATION
// ============================================================

const BASE = {
  range: 8,
  speed: 4.2,
  orbit: 2.3,

  warning: 0.4,
  attack: 0.8,
  recover: 0.9,

  shots: 2,
  gap: 0.28,

  turn: 4.5,
  attackTurn: 2.5,

  lead: 0.2,
  sweep: 0,

  predictionStrength: 0.2,
}

export const BOSS_PATTERNS = {
  shotgun: {
    range: 6,
    warning: 0.32,
    recover: 0.85,
    shots: 2,
    gap: 0.32,
    attack: 0.65,
    turn: 5.5,
    lead: 0.12,
  },

  machinegun: {
    range: 8,
    warning: 0.22,
    shots: 6,
    gap: 0.1,
    attack: 0.75,
    recover: 0.75,
    turn: 6,
    attackTurn: 3.2,
    sweep: 0.24,
    lead: 0.18,
  },

  cryogun: {
    range: 3.8,
    speed: 3.8,
    warning: 0.35,
    attack: 1,
    recover: 0.9,
    turn: 5,
    attackTurn: 2.5,
    lead: 0,
  },

  grenadegun: {
    range: 8,
    warning: 0.45,
    shots: 2,
    gap: 0.45,
    attack: 0.8,
    recover: 1,
    lead: 0.35,
    turn: 4.5,
  },

  acidthrowergun: {
    range: 3.8,
    speed: 4,
    warning: 0.3,
    attack: 1,
    recover: 0.85,
    attackTurn: 3,
    lead: 0,
  },

  missilegun: {
    range: 9,
    warning: 0.5,
    shots: 1,
    attack: 0.35,
    recover: 1.15,
    turn: 4.2,
    lead: 0,
  },

  flamethrowergun: {
    range: 4.3,
    speed: 4,
    warning: 0.35,
    attack: 1.1,
    recover: 0.9,
    turn: 5.5,
    attackTurn: 3.4,
    lead: 0,
  },

  lasergun: {
    range: 10,
    warning: 0.55,
    attack: 0.85,
    recover: 1,
    turn: 4.5,
    attackTurn: 1.6,
    lead: 0,
  },

  arcgun: {
    range: 8,
    warning: 0.35,
    attack: 0.7,
    recover: 0.9,
    attackTurn: 2.2,
    lead: 0,
  },

  plasmagun: {
    range: 10,
    warning: 0.45,
    attack: 1,
    recover: 0.95,
    attackTurn: 2,
    lead: 0,
  },
}

// ============================================================
// AIMING
// ============================================================

function getTargetAngle(id, playerId, weapon, pattern) {
  const isProjectile = weapon.category === "bullet"

  const lead = isProjectile
    ? Math.min(pattern.lead ?? 0, 0.25) *
      (pattern.predictionStrength ?? 0.2)
    : 0

  return aimAtPlayer(id, playerId, lead)
}

function trackPlayer({
  id,
  playerId,
  weapon,
  pattern,
  dt,
  turnMultiplier = 1,
}) {
  const target = getTargetAngle(
    id,
    playerId,
    weapon,
    pattern
  )

  Rotation[id] = rotateToward(
    Rotation[id],
    target,
    pattern.turn * turnMultiplier * dt
  )

  return target
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

function initializeBoss(state, id, type, weaponId, boss) {
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

  state.orbitDirection = type % 2 ? 1 : -1
  state.aim = Rotation[id]
  state.lockedAngle = Rotation[id]
}

function updateCombatPhase(state, id) {
  const next = getBossCombatPhase(
    Health.current[id],
    Health.max[id]
  )

  if (next === state.combatPhase) return

  state.combatPhase = next

  state.pattern = resolveBossPattern(
    state.basePattern,
    next
  )
}

// ============================================================
// COMBAT PHASE HANDLERS
// ============================================================

const PHASE_HANDLERS = {
  entrance(ctx) {
    const { state, id } = ctx

    if (
      state.timer >= 1.2 &&
      BossAI.decisionCooldown[id] <= 0
    ) {
      enterState(state, "approach", id)
    }
  },

  approach(ctx) {
    const {
      id,
      playerId,
      weapon,
      state,
      dt,
      distance,
    } = ctx

    const p = state.pattern

    state.aim = trackPlayer({
      id,
      playerId,
      weapon,
      pattern: p,
      dt,
    })

    const reach =
      weapon.category === "bullet"
        ? (weapon.speed ?? 10) *
          (weapon.lifetime ?? 1)
        : weapon.range ?? p.range

    if (
      state.timer >= 0.25 &&
      distance <= Math.min(
        p.range + 2,
        reach + 0.5
      )
    ) {
      enterState(state, "warning", id)
    }
  },

  warning(ctx) {
    const {
      id,
      playerId,
      weapon,
      state,
      dt,
    } = ctx

    const p = state.pattern

    state.aim = trackPlayer({
      id,
      playerId,
      weapon,
      pattern: p,
      dt,
      turnMultiplier: 1.25,
    })

    if (state.timer >= p.warning) {
      enterState(state, "attack", id)
    }
  },

  attack(ctx) {
    const {
      id,
      playerId,
      weapon,
      state,
      dt,
    } = ctx

    const p = state.pattern

    BossAI.beamActive[id] = 1

    state.aim = getTargetAngle(
      id,
      playerId,
      weapon,
      p
    )

    if (weapon.category !== "bullet") {
      // Continuous weapons track slowly while firing.
      Rotation[id] = rotateToward(
        Rotation[id],
        state.aim,
        (p.attackTurn ?? 2.5) * dt
      )

      state.lockedAngle = Rotation[id]
    } else {
      // Projectiles retain the firing direction
      // captured when the attack began.
      Rotation[id] = rotateToward(
        Rotation[id],
        state.aim,
        (p.attackTurn ?? p.turn) * 0.45 * dt
      )
    }

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
  },

  recover(ctx) {
    const {
      id,
      playerId,
      weapon,
      state,
      dt,
    } = ctx

    const p = state.pattern

    state.aim = trackPlayer({
      id,
      playerId,
      weapon,
      pattern: p,
      dt,
      turnMultiplier: 0.7,
    })

    if (state.timer >= p.recover) {
      enterState(state, "approach", id)
    }
  },
}

function updateCombatState(ctx) {
  const handler = PHASE_HANDLERS[ctx.state.phase]

  if (handler) {
    handler(ctx)
  } else {
    enterState(ctx.state, "approach", ctx.id)
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
    initializeBoss(state, id, type, weaponId, boss)
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

  if (state.frozen || dt <= 0) return

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

  updateBossTelegraph(state, id, weapon)

  BossAI.targetRotation[id] = state.aim

  BossAI.state[id] =
    state.phase === "attack"
      ? 0
      : state.phase === "recover"
        ? 1
        : 2
}
