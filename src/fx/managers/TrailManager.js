// src/fx/managers/TrailManager.js

import { registerEffect } from "../effects"
import { EFFECT } from "../FXTypes"

import {
    spawnTrailPuff
} from "../gpu/TrailEmitter.js"


const pending = []


const manager = {

    emit(effect) {

        pending.push(effect)

    },


    update() {

        while (pending.length) {

            const effect = pending.pop()

            spawnTrailPuff(effect)

        }

    },


    clear() {

        pending.length = 0

    }

}


registerEffect(
    EFFECT.TRAIL,
    manager
)