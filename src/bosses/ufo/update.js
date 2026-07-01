// src/bosses/ufo/update.js

import { world } from "../../ecs/constants/world"
import { ufoQuery } from "../../ecs/constants/queries"

import { updateMovement } from "./movement"
import { updateShooting } from "./shooting"

export function updateUfoBoss() {

    const dt = world.time.delta

    const ufos = ufoQuery()

    for (const id of ufos) {

        updateMovement(id, dt)

        updateShooting(id, dt)

    }

}