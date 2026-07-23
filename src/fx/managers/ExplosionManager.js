//src/fx/managers/ExplosionManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../FXTypes"
import { emitExplosion } from "../gpu/ExplosionEmitter"

const pending = []

const manager = {

    emit(effect) {

        pending.push(effect)

    },

    update() {

        while (pending.length) {

            emitExplosion(
                pending.pop()
            )

        }

    },

    clear() {

        pending.length = 0

    }

}

registerEffect(
    EFFECT.EXPLOSION,
    manager
)