//src/renderers/Scene.jsx

import { useFrame } from '@react-three/fiber'
import { world } from '../ecs/world.js'
import { movementSystem } from '../ecs/systems/movement.js'
import { boundsSystem } from '../ecs/systems/bounds.js'
import { combatSystem } from '../ecs/systems/combat.js'
import { PlayerRenderer } from './PlayerRenderer.jsx'
import { EnemyRenderer } from './EnemyRenderer.jsx'
import { BulletRenderer } from './BulletRenderer.jsx'
import { Position, Velocity, Rotation } from '../ecs/components.js'
import { spawnBullet } from '../ecs/entities.js'

const TURN_SPEED = 3.0   // radians/sec
const THRUST = 10    // acceleration units/sec²
const MAX_SPEED = 12    // units/sec
const DRAG = 0.98  // velocity multiplier per frame (inertia decay)

export function Scene({ keysRef, playerRef, shootTimerRef }) {
    useFrame((_, delta) => {
        world.time.delta = Math.min(delta, 0.05)
        world.time.elapsed += world.time.delta

        const dt = world.time.delta
        const keys = keysRef.current
        const pid = playerRef.current

        if (pid !== null) {
            // --- Rotation ---
            if (keys['ArrowLeft'] || keys['a']) Rotation[pid] += TURN_SPEED * dt
            if (keys['ArrowRight'] || keys['d']) Rotation[pid] -= TURN_SPEED * dt

            // --- Thrust ---
            if (keys['ArrowUp'] || keys['w']) {
                // Accelerate in the direction the ship is facing
                Velocity.x[pid] += Math.sin(-Rotation[pid]) * THRUST * dt
                Velocity.y[pid] += Math.cos(-Rotation[pid]) * THRUST * dt

                // Clamp to max speed
                const speed = Math.hypot(Velocity.x[pid], Velocity.y[pid])
                if (speed > MAX_SPEED) {
                    Velocity.x[pid] = (Velocity.x[pid] / speed) * MAX_SPEED
                    Velocity.y[pid] = (Velocity.y[pid] / speed) * MAX_SPEED
                }
            }

            // --- Drag (space friction) ---
            Velocity.x[pid] *= DRAG
            Velocity.y[pid] *= DRAG

            // --- Shooting ---
            shootTimerRef.current -= dt
            if (keys[' '] && shootTimerRef.current <= 0) {
                spawnBullet(Position.x[pid], Position.y[pid], Rotation[pid])
                shootTimerRef.current = 0.15
            }
        }

        movementSystem()
        boundsSystem()
        combatSystem()
    })

    return (
        <>
            <ambientLight intensity={0.4} />
            <pointLight position={[0, 0, 5]} intensity={2} color="#ffffff" />
            <PlayerRenderer />
            <EnemyRenderer />
            <BulletRenderer />
        </>
    )
}