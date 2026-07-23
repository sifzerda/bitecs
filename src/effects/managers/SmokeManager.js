// src/effects/managers/SmokeManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../EffectTypes"

import {
    emitSmoke,
    updateSmokeEmitter,
    smokePool
} from "../gpu/SmokeEmitter"

import { world } from "../../ecs/constants/world.js"


const pending = []


const smokeManager = {


    emit(effect) {

        pending.push(effect)

    },


    update() {


        // spawn queued smoke
        while (pending.length) {

            emitSmoke(
                pending.pop()
            )

        }


        // update typed arrays
        updateSmokeEmitter(
            world.time.delta
        )

    },


    clear() {

        pending.length = 0

        smokePool.clear()

    }

}


registerEffect(
    EFFECT.SMOKE,
    smokeManager
)