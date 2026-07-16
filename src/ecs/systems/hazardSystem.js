// src/ecs/systems/hazardSystem.js

import { removeEntity, hasComponent } from "bitecs"
import { world } from "../constants/world.js"
import { hazardQuery, bossQuery } from "../constants/queries.js"
import { Position, Health, HazardZone, Lifetime } from "../constants/components.js"
import { getWeapon } from "../constants/weapons.js"
import { spawnSparkBurst } from "../spawn.js"
import { killAsteroid, killBoss } from "./entityDeath.js"
import { activeAsteroids } from "../pools/asteroidPool"

export function hazardSystem() {

    const dt = world.time.delta
    const hazards = hazardQuery()
    const asteroids = activeAsteroids
    const bosses = bossQuery()

    for (let i = 0; i < hazards.length; i++) {

        const hid = hazards[i]
        const weapon = getWeapon(HazardZone.weaponType[hid])

        //----------------------------------
        // Lifetime
        //----------------------------------

        Lifetime.remaining[hid] -= dt

        if (Lifetime.remaining[hid] <= 0) {
            removeEntity(world, hid)
            continue
        }

        const targetId = HazardZone.target[hid]

        //----------------------------------
        // Attached hazards (nano swarm) — follow the target, die if it's gone
        //----------------------------------

        if (targetId !== -1) {

            if (!hasComponent(world, targetId, Health)) {
                removeEntity(world, hid)   // target already died or was removed elsewhere
                continue
            }

            Position.x[hid] = Position.x[targetId]
            Position.y[hid] = Position.y[targetId]
        }

        //----------------------------------
        // Tick timer
        //----------------------------------

        HazardZone.tickTimer[hid] -= dt
        if (HazardZone.tickTimer[hid] > 0) continue

        HazardZone.tickTimer[hid] = weapon.hazardTickInterval ?? 0.5

        if (targetId !== -1) {

            // attached: damage only the specific target it's chewing through
            Health.current[targetId] -= weapon.hazardDamage

            if (Health.current[targetId] <= 0) {
                killAsteroid(targetId, Position.x[targetId], Position.y[targetId])
                removeEntity(world, hid)
            }

        } else {

            // static cloud/puddle: damage everything currently overlapping it
            const radius = weapon.hazardRadius ?? 2
            const radiusSq = radius * radius

            for (let j = 0; j < asteroids.length; j++) {

                const aid = asteroids[j]
                const dx = Position.x[hid] - Position.x[aid]
                const dy = Position.y[hid] - Position.y[aid]

                if (dx * dx + dy * dy <= radiusSq) {

                    Health.current[aid] -= weapon.hazardDamage

                    if (Health.current[aid] <= 0) {
                        killAsteroid(aid, Position.x[aid], Position.y[aid])
                    }
                }
            }

            for (let j = 0; j < bosses.length; j++) {

                const bossId = bosses[j]
                const dx = Position.x[hid] - Position.x[bossId]
                const dy = Position.y[hid] - Position.y[bossId]
                const bossRadius = radius + 1.0

                if (dx * dx + dy * dy <= bossRadius * bossRadius) {

                    Health.current[bossId] -= weapon.hazardDamage

                    if (Health.current[bossId] <= 0) {
                        killBoss(bossId, Position.x[bossId], Position.y[bossId])
                    }
                }
            }

            spawnSparkBurst(Position.x[hid], Position.y[hid], { count: 6, speed: 2 })
        }
    }
}