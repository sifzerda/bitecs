// src/bosses/ufo/state.js

const bossState = new Map()

export function getBossState(id) {

    let state = bossState.get(id)

    if (!state) {

        state = {

            //---------------------------------
            // Movement
            //---------------------------------

            anchorX: 0,
            anchorY: 0,

            targetX: 0,
            targetY: 0,

            moveTimer: 0,

            //---------------------------------
            // Weapons
            //---------------------------------

            fireTimer: 0,

            //---------------------------------
            // Future
            //---------------------------------

            phase: 1,

            enraged: false

        }

        bossState.set(id, state)

    }

    return state

}

export function removeBossState(id) {

    bossState.delete(id)

}