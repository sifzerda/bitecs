// src/fx/gpu/exhaustEmitter.js

import { emitEffect } from "../effects"
import { EFFECT } from "../FXTypes"
import { Position, Velocity, Rotation } from "../../ecs/constants/components"
import { playerQuery, bossAIQuery } from "../../ecs/constants/queries"
import { input } from "../../ecs/systems/input"
import { acquireExhaust } from "../../ecs/pools/exhaustPool"

export function exhaustEmitter() {

    const players = playerQuery()

    if (players.length) {

        const id = players[0]

        const effect = acquireExhaust()

        effect.slot = 0
        effect.x = Position.x[id]
        effect.y = Position.y[id]
        effect.vx = Velocity.x[id]
        effect.vy = Velocity.y[id]
        effect.rot = Rotation[id]
        effect.emitting = input.thrust

        emitEffect(EFFECT.EXHAUST, effect)

    }

    const bosses = bossAIQuery()

    for (let i = 0; i < bosses.length; i++) {

        const id = bosses[i]

        const effect = acquireExhaust()

        effect.slot = i + 1
        effect.x = Position.x[id]
        effect.y = Position.y[id]
        effect.vx = Velocity.x[id]
        effect.vy = Velocity.y[id]
        effect.rot = Rotation[id]
        effect.emitting = true

        emitEffect(EFFECT.EXHAUST, effect)

    }

}