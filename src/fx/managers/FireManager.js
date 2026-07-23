// src/fx/managers/FireManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../FXTypes"
import { emitFire } from "../gpu/FireEmitter"

const pending = []

const manager = {

    emit(effect) {

        pending.push(effect)

    },

    update() {

        while (pending.length) {

            emitFire(
                pending.pop()
            )

        }

    },

    clear() {

        pending.length = 0

    }

}

registerEffect(
    EFFECT.FIRE,
    manager
)