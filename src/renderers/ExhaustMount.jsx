// src/renderers/ExhaustMount.jsx

import { ExhaustRenderer } from './ExhaustRenderer.jsx'
import { Position, Velocity, Rotation } from '../ecs/constants/components.js'
import { playerQuery, bossAIQuery } from '../ecs/constants/queries.js'
import { input } from '../ecs/systems/input.js'
import { gameState } from '../state/gameState.js'

const MAX_BOSSES = 4 // keep in sync with BossRenderer.jsx

export function ExhaustMount() {
  return (
    <>
      <ExhaustRenderer
        getShip={() => {
          const players = playerQuery()
          if (!players.length) return null
          const pid = players[0]
          return {
            x: Position.x[pid], y: Position.y[pid],
            vx: Velocity.x[pid], vy: Velocity.y[pid],
            rot: Rotation[pid],
            emitting: input.thrust,
            boost: gameState.boostActive > 0,
          }
        }}
      />

      {Array.from({ length: MAX_BOSSES }).map((_, slot) => (
        <ExhaustRenderer
          key={slot}
          size={5}
          nozzleOffset={-0.80}   // boss hull tailY is -0.75, bigger ship than player
          engineGap={0.35}      // matches Boss / Engine Intake offsetX in Leva
          hotCore="#ff8a1a"     // slightly different fire tone from the player
          fireColor="#ff5a12"
          getShip={() => {
            const bosses = bossAIQuery()
            if (slot >= bosses.length) return null
            const id = bosses[slot]
            return {
              x: Position.x[id], y: Position.y[id],
              vx: Velocity.x[id], vy: Velocity.y[id],
              rot: Rotation[id],
              emitting: true, // boss AI thrusts every frame currently
              boost: false,
            }
          }}
        />
      ))}
    </>
  )
}