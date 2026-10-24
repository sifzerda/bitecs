// src/ecs/systems/statusEffectSystem.js

import { hasComponent, addComponent } from "bitecs"
import { world } from "../constants/world.js"
import { StatusEffect, Health, Position } from "../constants/components.js"
import { playerQuery, bossQuery } from "../constants/queries.js"
import { activeAsteroids } from "../pools/asteroidPool.js"
import { killAsteroid, killBoss } from "./entityDeath.js"
import { damagePlayer } from "./playerDamage.js"

export function applyStatusEffects(id, weapon) {
    if (!hasComponent(world, id, StatusEffect)) addComponent(world, id, StatusEffect)
    if (weapon.corrosion && weapon.corrosionDamage > 0 && weapon.corrosionDuration > 0) {
        StatusEffect.corrosionDamage[id] = Math.max(StatusEffect.corrosionDamage[id], weapon.corrosionDamage)
        StatusEffect.corrosionRemaining[id] = Math.max(StatusEffect.corrosionRemaining[id], weapon.corrosionDuration)
    }
    if (weapon.freezeDuration > 0) StatusEffect.frozen[id] = Math.max(StatusEffect.frozen[id], weapon.freezeDuration)
}
function tick(id, dt, kill, player = false) {
    if (!hasComponent(world, id, StatusEffect)) return
    StatusEffect.frozen[id] = Math.max(0, StatusEffect.frozen[id] - dt)
    const remaining = StatusEffect.corrosionRemaining[id]
    if (remaining <= 0) return
    const damage = StatusEffect.corrosionDamage[id] * Math.min(dt, remaining)
    StatusEffect.corrosionRemaining[id] = Math.max(0, remaining - dt)
    if (player) { damagePlayer(id, damage, { periodic: true }) } else {
        Health.current[id] -= damage
        if (Health.current[id] <= 0) { kill(id, Position.x[id], Position.y[id]); return }
    }
    if (StatusEffect.corrosionRemaining[id] === 0) StatusEffect.corrosionDamage[id] = 0
}
export function statusEffectSystem() {
    const dt = world.time.delta
    for (let i = activeAsteroids.length - 1; i >= 0; i--)tick(activeAsteroids[i], dt, killAsteroid)
    for (const id of [...bossQuery()]) tick(id, dt, killBoss)
    for (const id of playerQuery()) tick(id, dt, null, true)
}
