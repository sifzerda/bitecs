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

const DEFAULT_BOSS_HEALTH = 300

export function spawnBoss(bossKey = "shotgun") {
  const id = addEntity(world)

  addComponent(world, id, Position)
  addComponent(world, id, Velocity)
  addComponent(world, id, Rotation)
  addComponent(world, id, Health)
  addComponent(world, id, BossTag)
  addComponent(world, id, BossAI)
  addComponent(world, id, BossType)
  addComponent(world, id, StatusEffect)

  const bossIndex = BOSS_INDEX_BY_KEY[bossKey] ?? 0
  const config = BOSSES[bossIndex]

  Position.x[id] = 0
  Position.y[id] = 0

  Velocity.x[id] = 0
  Velocity.y[id] = 0

  Rotation[id] = 0

  const health = config?.health ?? DEFAULT_BOSS_HEALTH

  Health.current[id] = health
  Health.max[id] = health

  StatusEffect.frozen[id] = 0
  StatusEffect.corrosionDamage[id] = 0
  StatusEffect.corrosionRemaining[id] = 0

  const gunType = config?.gun
    ? getGunTypeById(config.gun.typeId)
    : null

  BossAI.weapon[id] = gunType?.weaponId ?? 0

  BossAI.moveTimer[id] = 0
  BossAI.shootTimer[id] = 0.5 + Math.random() * 0.5
  BossAI.beamCycleTimer[id] = 3
  BossAI.beamActive[id] = 1
  BossAI.targetRotation[id] = 0

  BossAI.aimError[id] = 0
  BossAI.aimErrorTimer[id] =
    0.2 + Math.random() * 0.6

  BossAI.burstRemaining[id] = 0
  BossAI.burstGapTimer[id] = 0

  BossAI.state[id] = 0
  BossAI.stateTimer[id] =
    1.5 + Math.random() * 1.3

  BossAI.moveRotation[id] = 0
  BossAI.strafeDirection[id] =
    Math.random() < 0.5 ? -1 : 1

  BossAI.aggression[id] =
    0.35 + Math.random() * 0.55

  BossAI.attackTimer[id] = 0
  BossAI.decisionCooldown[id] = 0

  BossType.typeIndex[id] = bossIndex

  if (config?.key === "octopus") {
    resetOctopusBoss(id)
  }

  return id
}

export function isBossAlive(id) {
  return (
    Number.isInteger(id) &&
    id >= 0 &&
    entityExists(world, id) &&
    bossQuery().includes(id) &&
    Health.current[id] > 0
  )
}

/**
 * Remove a boss and return its final state.
 * Scoring, FX and encounter progression are handled elsewhere.
 */
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
