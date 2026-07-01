// src/bosses/ufo/shooting.js

import { playerQuery } from "../../ecs/constants/queries"
import { Position } from "../../ecs/components"
import { spawnEnemyBullet } from "../../ecs/spawnEnemyBullet"

import { UFO_BOSS } from "./config"
import { getBossState } from "./state"

export function updateShooting(id, dt) {

    const players = playerQuery()

    if (players.length === 0)
        return

    const player = players[0]

    const state = getBossState(id)

    state.fireTimer -= dt

    if (state.fireTimer > 0)
        return

    state.fireTimer = UFO_BOSS.fireInterval

    const dx =
        Position.x[player] -
        Position.x[id]

    const dy =
        Position.y[player] -
        Position.y[id]

    const angle =
        Math.atan2(dy, dx) +
        (Math.random() - 0.5) *
        UFO_BOSS.aimSpread

    spawnEnemyBullet(

        Position.x[id],
        Position.y[id],
        angle

    )

}