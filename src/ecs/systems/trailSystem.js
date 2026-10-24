// src/ecs/systems/trailSystem.js

import * as THREE from "three"
import { Position, Velocity, Bullet, Lifetime } from "../constants/components.js"
import { WEAPONS } from "../weapons/config/weapons.js"
import { activeBullets } from "../pools/bulletPool.js"
import { emitEffect } from "../../fx/effects.js"
import { EFFECT } from "../../fx/FXTypes.js"

const states = new Map(), colors = new Map(), seen = new Set()
const SPACING = 0.1, MAX_PUFFS = 24

export function resetTrails() {
    states.clear();
    seen.clear()
}

export function trailSystem() {
    seen.clear()

    for (const id of activeBullets) {
        const weapon = WEAPONS[Bullet.type[id]];
        if (!weapon?.trail)
            continue
        
        seen.add(id)
        const x = Position.x[id]
        const y = Position.y[id]
        const life = Lifetime.remaining[id]

        let s = states.get(id)

        if (!s || s.type !== weapon.id || life > s.life) {
            states.set(id, { x, y, life, type: weapon.id, left: 0 });
            continue
        }

        const mx = x - s.x, my = y - s.y, d = Math.hypot(mx, my)
        // Ignore teleports/wraps rather than drawing across the arena.
        if (d > 4) {
            s.x = x; s.y = y; s.life = life; s.left = 0;
            continue
        }

        let color = colors.get(weapon.id)
       
        if (!color) { color = new THREE.Color(weapon.trailColor ?? weapon.glowColor ?? "#ff6600"); colors.set(weapon.id, color) }
       
        let distance = SPACING - s.left, count = 0
        const speed = Math.hypot(Velocity.x[id], Velocity.y[id]) || 1

        while (distance <= d && count++ < MAX_PUFFS) {

            const t = distance / Math.max(d, 1e-8)

            emitEffect(EFFECT.TRAIL, { x: s.x + mx * t - Velocity.x[id] / speed * 0.22, y: s.y + my * t - Velocity.y[id] / speed * 0.22, vx: Velocity.x[id] * 0.18, vy: Velocity.y[id] * 0.18, size: 0.08 + Math.random() * 0.06, maxLife: 0.85, r: color.r, g: color.g, b: color.b })
            distance += SPACING
        }

        s.left = (s.left + d) % SPACING; s.x = x; s.y = y; s.life = life
    }
    for (const id of states.keys()) if (!seen.has(id)) states.delete(id)
}
