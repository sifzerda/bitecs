// src/ecs/systems/bossAISystem.js

import { world } from "../constants/world.js"
import { bossAIQuery, playerQuery } from "../constants/queries.js"
import { Position, Velocity, Rotation, Health, StatusEffect, Asteroid, BossAI, BossType } from "../constants/components.js"
import { BOSSES } from "../constants/bosses.js"
import { getBossEmissionConfig, getEmissionPoint } from "../constants/emission.js"
import { getWeapon } from "../weapons/config/weapons.js"
import { spawnBossBullet } from "../spawn.js"
import { bossLaserState } from "../weapons/weaponState/bossLaserState.js"
import { bossThrowerState } from "../weapons/weaponState/bossThrowerState.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { killAsteroid } from "./entityDeath.js"
import { damagePlayer } from "./playerDamage.js"
import { applyStatusEffects } from "./statusEffectSystem.js"
import { startState } from "../../state/startState.js"
import { useGameStore, SCREEN } from "../../../store/gameStore.js"

// All ship-boss tuning is here. No behaviour tree or steering module required.
// attack = seconds firing, recover = an opening to approach and return fire.
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
  sweep: 0
}

export const BOSS_PATTERNS = {
  shotgun: { range: 6, warning: 0.8, shots: 2, gap: 0.4, attack: 0.65, recover: 1.4 },
  machinegun: { range: 8, warning: 0.8, shots: 6, gap: 0.12, attack: 0.8, recover: 1.5, sweep: 0.24 },
  cryogun: { range: 3.8, speed: 3.8, warning: 0.9, attack: 1.0, recover: 1.5, lead: 0 },
  grenadegun: { range: 8, warning: 0.95, shots: 2, gap: 0.55, attack: 0.8, recover: 1.6, lead: 0.35 },
  acidthrowergun: { range: 3.8, speed: 4.0, warning: 0.9, attack: 1.0, recover: 1.5, lead: 0 },
  missilegun: { range: 9, warning: 1.0, shots: 1, attack: 0.35, recover: 1.8, lead: 0 },
  flamethrowergun: { range: 4.3, speed: 4.0, warning: 1.0, attack: 1.1, recover: 1.6, lead: 0 },
  lasergun: { range: 10, warning: 1.15, attack: 0.85, recover: 1.7, lead: 0 },
  arcgun: { range: 8, warning: 1.0, attack: 0.7, recover: 1.7, lead: 0 },
  plasmagun: { range: 10, warning: 1.1, attack: 1.0, recover: 1.6, lead: 0 },
}

export const bossFightState = {
  eid: -1,
  type: -1,
  weaponId: -1,
  phase: "entrance",
  timer: 0,
  aim: 0,
  lockedAngle: 0,
  shots: 0,
  shotTimer: 0,
  cycles: 0,
  orbitDirection: 1,
  pattern: null,
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

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
function rotateToward(a, b, max) {
  return a + clamp(angleDifference(b, a), -max, max)
}

function clearWeapons() {
  bossLaserState.active = false;
  bossLaserState.beamCount = 0;
  bossLaserState.hitLegacy = false
  bossLaserState.hit.fill(0)
  bossThrowerState.active = false
}

export function resetBossAI() {
  Object.assign(bossFightState, {
    eid: -1,
    type: -1,
    weaponId: -1,
    phase: "entrance",
    timer: 0,
    warning: false,
    frozen: false,
    shots: 0,
    cycles: 0
  })
  clearWeapons()
}

export function setBossArenaSize(width, height) {
  if (width > 0 && height > 0) {
    bossFightState.width = width;
    bossFightState.height = height
  }
}

function enter(phase) {

  const s = bossFightState
  s.phase = phase; s.timer = 0

  if (phase === "attack") {
    s.lockedAngle = Rotation[s.eid];
    s.shots = 0; s.shotTimer = 0
  }

  if (phase === "recover") {
    s.cycles++;
    s.orbitDirection *= -1
  }
}

function steer(id, pid, p, dt) {

  const s = bossFightState
  const dx = Position.x[id] - Position.x[pid]
  const dy = Position.y[id] - Position.y[pid]
  const distance = Math.hypot(dx, dy)
  const ax = distance > 0.001 ? dx / distance : 1
  const ay = distance > 0.001 ? dy / distance : 0
  let vx = 0, vy = 0

  if (s.phase === "approach") {
    const radial = clamp((distance - p.range) * 1.4, -p.speed, p.speed)
    vx = -ax * radial - ay * p.orbit * s.orbitDirection
    vy = -ay * radial + ax * p.orbit * s.orbitDirection

  } else if (s.phase === "recover") {
    vx = -ay * p.orbit * 0.35 * s.orbitDirection
    vy = ax * p.orbit * 0.35 * s.orbitDirection
  }

  // Keep ship bosses on screen, with a margin for their hull.
  const mx = Math.max(1, s.width / 2 - 2.1)
  const my = Math.max(1, s.height / 2 - 2.1)
  vx += clamp((-mx - Position.x[id]) * 3, 0, p.speed) - clamp((Position.x[id] - mx) * 3, 0, p.speed)
  vy += clamp((-my - Position.y[id]) * 3, 0, p.speed) - clamp((Position.y[id] - my) * 3, 0, p.speed)
  // Do not accelerate into a player who approaches the stationary attack.
  const speed = Math.hypot(vx, vy)

  if (speed > p.speed) {
    vx *= p.speed / speed;
    vy *= p.speed / speed
  }
  const response = s.phase === "approach" ? 3 : 8
  let fx = (vx - Velocity.x[id]) * response
  let fy = (vy - Velocity.y[id]) * response

  const force = Math.hypot(fx, fy)

  if (force > 12) {
    fx *= 12 / force;
    fy *= 12 / force
  }

  Velocity.x[id] += fx * dt;
  Velocity.y[id] += fy * dt
  return distance
}

function aimAtPlayer(id, pid, lead) {
  return -Math.atan2(Position.x[pid] + Velocity.x[pid] * lead - Position.x[id], Position.y[pid] + Velocity.y[pid] * lead - Position.y[id])
}

function emission(id, category, angle) {
  const cfg = getBossEmissionConfig(id, category)
  const point = getEmissionPoint(Position.x[id], Position.y[id], angle, cfg)
  return {
    x: point.x,
    y: point.y,
    gap: cfg.gunGap ?? cfg.engineGap ?? 0
  }
}

// Distance to the first entry into a circular hitbox along a unit ray.
export function rayCircle(x, y, dx, dy, cx, cy, radius, maxLength) {

  const rx = cx - x, ry = cy - y, d2 = rx * rx + ry * ry

  if (d2 <= radius * radius) return 0

  const projection = rx * dx + ry * dy

  if (projection < 0) return Infinity

  const perpendicularSq = Math.max(0, d2 - projection * projection)

  if (perpendicularSq > radius * radius) return Infinity

  const t = Math.max(0, projection - Math.sqrt(radius * radius - perpendicularSq))

  return t <= maxLength ? t : Infinity
}

export function coneHits(x, y, dx, dy, angle, range, cx, cy, radius) {
  const rx = cx - x, ry = cy - y, distance = Math.hypot(rx, ry)

  if (distance > range + radius)
    return false
  if (distance <= radius)
    return true
  return (rx * dx + ry * dy) / distance >= Math.cos(Math.min(Math.PI, angle / 2 + Math.asin(Math.min(1, radius / distance))))
}

function damageWithStatus(pid, amount, weapon) {
  if (damagePlayer(pid, amount, {
    periodic: true
  }
  ) && (weapon.corrosion || weapon.freezeDuration))
    applyStatusEffects(pid, weapon)
}

function fireBeam(id, pid, weapon, dt) {

  const angle = Rotation[id]
  const dx = Math.sin(-angle)
  const dy = Math.cos(-angle)
  const m = emission(id, "beam", angle)
  const sideX = Math.cos(-angle)
  const sideY = -Math.sin(-angle)
  const count = m.gap ? 2 : 1
  const range = weapon.range ?? 20
  const width = (weapon.beamWidth ?? 0.1) * 0.5

  bossLaserState.active = true; bossLaserState.beamCount = count

  for (let n = 0; n < count; n++) {
    const gap = count === 1 ? 0 : (n === 0 ? m.gap : -m.gap)
    const x = m.x + sideX * gap
    const y = m.y + sideY * gap

    let length = range, target = -1, asteroid = false

    const playerT = rayCircle(x, y, dx, dy, Position.x[pid], Position.y[pid], 0.6 + width, range)

    if (playerT !== Infinity) {
      length = playerT; target = pid
    }
    for (const aid of activeAsteroids) {
      if (Health.current[aid] <= 0)
        continue

      const t = rayCircle(x, y, dx, dy, Position.x[aid], Position.y[aid], Asteroid.radius[aid] + width, length)

      if (t < length) {
        length = t; target = aid; asteroid = true
      }
    }
    const damage = (weapon.directDamage ?? 0) * dt / count
    if (target === pid && !asteroid)
      damageWithStatus(pid, damage, weapon)
    else if (target >= 0) {
      Health.current[target] -= damage
      if (Health.current[target] <= 0)
        killAsteroid(target, Position.x[target], Position.y[target])
    }

    bossLaserState.originX[n] = x;
    bossLaserState.originY[n] = y
    bossLaserState.dirX[n] = dx;
    bossLaserState.dirY[n] = dy
    bossLaserState.hitT[n] = length
    bossLaserState.hitX[n] = x + dx * length;
    bossLaserState.hitY[n] = y + dy * length
    bossLaserState.hit[n] = target >= 0 ? 1 : 0
  }
  bossLaserState.hitLegacy = bossLaserState.hit[0] !== 0
  bossLaserState.hitXLegacy = bossLaserState.hitX[0];
  bossLaserState.hitYLegacy = bossLaserState.hitY[0]
  bossLaserState.length = bossLaserState.hitT[0]
}

function fireThrower(id, pid, weapon, dt) {
  const angle = Rotation[id], dx = Math.sin(-angle), dy = Math.cos(-angle)
  const m = emission(id, "thrower", angle), sx = Math.cos(-angle) * m.gap, sy = -Math.sin(-angle) * m.gap
  const s = bossThrowerState
  s.active = true;
  s.originX = m.x;
  s.originY = m.y
  s.originAX = m.x + sx;
  s.originAY = m.y + sy;
  s.originBX = m.x - sx;
  s.originBY = m.y - sy
  s.dirX = dx;
  s.dirY = dy;
  s.range = s.length = weapon.range ?? 5;
  s.coneAngle = weapon.coneAngle ?? 0.55

  const hitA = coneHits(s.originAX, s.originAY, dx, dy, s.coneAngle, s.range, Position.x[pid], Position.y[pid], 0.6)
  const hitB = coneHits(s.originBX, s.originBY, dx, dy, s.coneAngle, s.range, Position.x[pid], Position.y[pid], 0.6)
  if (hitA || hitB)
    damageWithStatus(pid, (weapon.directDamage ?? 0) * dt, weapon)
}

export function bossAISystem() {
  clearWeapons()
  const game = useGameStore.getState(), s = bossFightState
  if (game.screen !== SCREEN.PLAY || game.paused || startState.encounterPhase !== "active") { s.warning = false; return }
  const id = bossAIQuery().find(eid => BOSSES[BossType.typeIndex[eid]]?.isShip !== false)
  const pid = playerQuery()[0]
  if (id === undefined || pid === undefined) {
    resetBossAI(); return
  }
  const type = BossType.typeIndex[id]
  const weaponId = BossAI.weapon[id]
  const boss = BOSSES[type], weapon = getWeapon(weaponId)

  if (!weapon || Health.current[id] <= 0 || Health.current[pid] <= 0) return
  if (s.eid !== id || s.type !== type || s.weaponId !== weaponId) {

    resetBossAI();
    s.eid = id;
    s.type = type;
    s.weaponId = weaponId
    s.pattern = { ...BASE, ...BOSS_PATTERNS[boss?.key], ...boss?.ai }
    s.orbitDirection = type % 2 ? 1 : -1
  }

  const dt = Math.min(Math.max(world.time.delta, 0), 0.05),
    p = s.pattern
  s.warning = false;
  s.frozen = StatusEffect.frozen[id] > 0

  BossAI.beamActive[id] = 0
  if (s.frozen || dt <= 0) return
  BossAI.decisionCooldown[id] = Math.max(0, BossAI.decisionCooldown[id] - dt)
  s.timer += dt

  const distance = steer(id, pid, p, dt)

  if (s.phase === "entrance") {
    if (s.timer >= 1.5 && BossAI.decisionCooldown[id] <= 0) enter("approach")

  } else if (s.phase === "approach") {
    Rotation[id] = rotateToward(Rotation[id],
      aimAtPlayer(id, pid, 0), p.turn * dt)
    const reach = weapon.category === "bullet" ? (weapon.speed ?? 10) * (weapon.lifetime ?? 1) : (weapon.range ?? p.range)

    if (s.timer >= 0.65 && distance <= Math.min(p.range + 2, reach + 0.5)) {
      s.aim = aimAtPlayer(id, pid, p.lead);
      enter("warning")
    }

  } else if (s.phase === "warning") {
    // Aim is locked at warning entry. No perfect player tracking during an attack.
    Rotation[id] = rotateToward(Rotation[id], s.aim, p.turn * dt)
    s.warning = true
    if (s.timer >= p.warning) {
      enter("attack");
      s.warning = false
    }

  } else if (s.phase === "attack") {
    Rotation[id] = s.lockedAngle
    BossAI.beamActive[id] = 1

    if (weapon.category === "bullet") {
      s.shotTimer -= dt

      if (s.shots < p.shots && s.shotTimer <= 0) {
        const fraction = p.shots > 1 ? s.shots / (p.shots - 1) - 0.5 : 0
        // Sweeping bursts are bounded and deterministic, not fresh aimbot shots.
        spawnBossBullet(Position.x[id], Position.y[id], s.lockedAngle + fraction * p.sweep, weapon.id, id)
        s.shots++;
        s.shotTimer += Math.max(1 / 60, p.gap)
      }

    } else if (weapon.category === "beam")
      fireBeam(id, pid, weapon, dt)

    else if (weapon.category === "thrower")
      fireThrower(id, pid, weapon, dt)

    if (s.timer >= p.attack) {
      enter("recover");
      clearWeapons();
      BossAI.beamActive[id] = 0
    }

  } else if (s.phase === "recover" && s.timer >= p.recover)
    enter("approach")

  const category = weapon.category === "bullet" ? "projectile" : weapon.category
  const m = emission(id, category, Rotation[id])

  s.originX = m.x;
  s.originY = m.y;
  s.dirX = Math.sin(-Rotation[id]);
  s.dirY = Math.cos(-Rotation[id])
  s.range = weapon.range ?? (weapon.speed ?? 10) * (weapon.lifetime ?? 1)
  s.gap = m.gap
  s.coneAngle = (weapon.coneAngle ?? weapon.spreadAngle ?? 0) + (p.sweep ?? 0)

  BossAI.targetRotation[id] = s.aim
  BossAI.state[id] = s.phase === "attack" ? 0 : s.phase === "recover" ? 1 : 2
}
