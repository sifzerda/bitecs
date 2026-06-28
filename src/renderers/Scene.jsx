//src/renderers/Scene.jsx

import { useFrame } from '@react-three/fiber'
import { query } from 'bitecs'
import { world } from '../ecs/world.js'
import { movementSystem } from '../ecs/systems/movement.js'
import { boundsSystem } from '../ecs/systems/bounds.js'
import { combatSystem } from '../ecs/systems/combat.js'
import { PlayerRenderer } from './PlayerRenderer.jsx'
import { EnemyRenderer } from './EnemyRenderer.jsx'
import { BulletRenderer } from './BulletRenderer.jsx'
import { Position, Velocity, Rotation, Health, PlayerTag } from '../ecs/components.js'
import { spawnBullet } from '../ecs/entities.js'
import { gameState } from '../state/gameState.js'

const TURN_SPEED = 4.5
const THRUST = 28    // stronger push
const BRAKE = 18    // retro-thrust is weaker than main engine
const MAX_SPEED = 24    // higher top speed — you have to earn it
const DRAG = 0.995 // near-frictionless space — momentum persists

export function Scene({ keysRef, playerRef, shootTimerRef, paused }) {
  useFrame((_, delta) => {
    if (paused) return
    world.time.delta    = Math.min(delta, 0.05)
    world.time.elapsed += world.time.delta

    const dt   = world.time.delta
    const keys = keysRef.current
    const pid  = playerRef.current

    if (pid !== null) {
      if (keys['ArrowLeft']  || keys['a']) Rotation[pid] += TURN_SPEED * dt
      if (keys['ArrowRight'] || keys['d']) Rotation[pid] -= TURN_SPEED * dt

      if (keys['ArrowUp'] || keys['w']) {
        Velocity.x[pid] += Math.sin(-Rotation[pid]) * THRUST * dt
        Velocity.y[pid] += Math.cos(-Rotation[pid]) * THRUST * dt
      }

      if (keys['ArrowDown'] || keys['s']) {
        Velocity.x[pid] -= Math.sin(-Rotation[pid]) * BRAKE * dt
        Velocity.y[pid] -= Math.cos(-Rotation[pid]) * BRAKE * dt
      }

      const speed = Math.hypot(Velocity.x[pid], Velocity.y[pid])
      if (speed > MAX_SPEED) {
        Velocity.x[pid] = (Velocity.x[pid] / speed) * MAX_SPEED
        Velocity.y[pid] = (Velocity.y[pid] / speed) * MAX_SPEED
      }

      Velocity.x[pid] *= DRAG
      Velocity.y[pid] *= DRAG

      shootTimerRef.current -= dt
      if (keys[' '] && shootTimerRef.current <= 0) {
        spawnBullet(Position.x[pid], Position.y[pid], Rotation[pid])
        shootTimerRef.current = 0.15
      }
    }

    movementSystem()
    boundsSystem()
    combatSystem()

    // Update player health in gameState
    const [playerEid] = query(world, [Position, PlayerTag])
    if (playerEid !== undefined) {
      gameState.health = Math.round(Health.current[playerEid])
    }
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