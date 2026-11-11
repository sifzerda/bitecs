// src/ecs/bosses/BossManager.js

import {
  addEntity,
  addComponent,
  entityExists,
  removeEntity,
} from "bitecs"

import { world } from "../constants/world.js"

import {
  Position,
  Velocity,
  Rotation,
  Health,
  BossTag,
  BossAI,
  BossType,
  StatusEffect,
} from "../constants/components.js"

import {
  BOSSES,
  BOSS_INDEX_BY_KEY,
} from "../constants/bosses.js"

import { bossQuery } from "../constants/queries.js"
import { getGunTypeById } from "../weapons/config/gunConfigs.js"
import { resetOctopusBoss } from "../systems/octopusBossSystem.js"

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_BOSS_HEALTH = 300

const BOSS_COMPONENTS = [
  Position,
  Velocity,
  Rotation,
  Health,
  BossTag,
  BossAI,
  BossType,
  StatusEffect,
]

// ============================================================
// HELPERS
// ============================================================

function initializeComponents(id) {
  for (const component of BOSS_COMPONENTS) {
    addComponent(world, id, component)
  }
}

function initializeTransform(id) {
  Position.x[id] = 0
  Position.y[id] = 0

  Velocity.x[id] = 0
  Velocity.y[id] = 0

  Rotation[id] = 0
}

function initializeHealth(id, config) {
  const health = config?.health ?? DEFAULT_BOSS_HEALTH

  Health.current[id] = health
  Health.max[id] = health
}

function initializeStatusEffects(id) {
  StatusEffect.frozen[id] = 0

  StatusEffect.corrosionDamage[id] = 0
  StatusEffect.corrosionRemaining[id] = 0
}

function initializeWeapon(id, config) {
  const gunType = config?.gun
    ? getGunTypeById(config.gun.typeId)
    : null

  BossAI.weapon[id] = gunType?.weaponId ?? 0
}

function initializeMovement(id) {
  BossAI.moveTimer[id] = 0
  BossAI.moveRotation[id] = 0

  BossAI.strafeDirection[id] =
    Math.random() < 0.5 ? -1 : 1

  BossAI.aggression[id] =
    0.35 + Math.random() * 0.55
}

function initializeAiming(id) {
  BossAI.targetRotation[id] = Rotation[id]

  BossAI.aimError[id] = 0

  BossAI.aimErrorTimer[id] =
    0.2 + Math.random() * 0.6
}

function initializeCombat(id) {
  // Initial attack delay
  BossAI.shootTimer[id] =
    0.5 + Math.random() * 0.5

  // Beam state
  BossAI.beamCycleTimer[id] = 3
  BossAI.beamActive[id] = 0

  // Burst state
  BossAI.burstRemaining[id] = 0
  BossAI.burstGapTimer[id] = 0

  // Tactical state
  BossAI.state[id] = 0

  BossAI.stateTimer[id] =
    1.5 + Math.random() * 1.3

  BossAI.attackTimer[id] = 0
  BossAI.decisionCooldown[id] = 0
}

// ============================================================
// SPAWN BOSS
// ============================================================

export function spawnBoss(bossKey = "shotgun") {
  const bossIndex = BOSS_INDEX_BY_KEY[bossKey] ?? 0
  const config = BOSSES[bossIndex]

  if (!config) {
    console.error(
      "[BossManager] Invalid boss configuration:",
      bossKey
    )

    return -1
  }

  const id = addEntity(world)

  initializeComponents(id)
  initializeTransform(id)
  initializeHealth(id, config)
  initializeStatusEffects(id)
  initializeWeapon(id, config)
  initializeMovement(id)
  initializeAiming(id)
  initializeCombat(id)

  BossType.typeIndex[id] = bossIndex

  // Specialized bosses
  if (config.key === "octopus") {
    resetOctopusBoss(id)
  }

  return id
}

// ============================================================
// BOSS VALIDATION
// ============================================================

export function isBossAlive(id) {
  if (
    !Number.isInteger(id) ||
    id < 0 ||
    !entityExists(world, id)
  ) {
    return false
  }

  return (
    bossQuery().includes(id) &&
    Health.current[id] > 0
  )
}

// ============================================================
// DESTROY BOSS
// ============================================================

export function destroyBoss(id) {
  if (
    !Number.isInteger(id) ||
    id < 0 ||
    !entityExists(world, id) ||
    !bossQuery().includes(id)
  ) {
    return null
  }

  const vx = Velocity.x[id]
  const vy = Velocity.y[id]

  const snapshot = {
    id,

    type: BossType.typeIndex[id],
    weaponId: BossAI.weapon[id],

    x: Position.x[id],
    y: Position.y[id],

    direction:
      vx === 0 && vy === 0
        ? Math.random() * Math.PI * 2
        : Math.atan2(vy, vx),
  }

  removeEntity(world, id)

  return snapshot
}
