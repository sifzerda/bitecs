// src/fx/gpu/exhaustEmitter.js

import { emitEffect } from "../effects"
import { EFFECT } from "../EffectTypes"
import { Position, Velocity, Rotation } from "../../ecs/constants/components"
import { playerQuery, bossAIQuery } from "../../ecs/constants/queries"
import { input } from "../../ecs/systems/input"
import { gameState } from "../../state/gameState"

export function exhaustEmitter() {

    const players = playerQuery()

    if (players.length) {

        const id = players[0]

        emitEffect(EFFECT.EXHAUST, {
            slot: 0,
            x: Position.x[id],
            y: Position.y[id],
            vx: Velocity.x[id],
            vy: Velocity.y[id],
            rot: Rotation[id],
            emitting: input.thrust,
            boost: gameState.boostActive > 0,
        })

    }

    const bosses = bossAIQuery()

    for (let i = 0; i < bosses.length; i++) {

        const id = bosses[i]

        emitEffect(EFFECT.EXHAUST, {
            slot: i + 1,
            x: Position.x[id],
            y: Position.y[id],
            vx: Velocity.x[id],
            vy: Velocity.y[id],
            rot: Rotation[id],
            emitting: true,
            boost: false,
        })

    }

}