//src/ecs/systems/bossBehaviorTree.js


import * as b3 from "behavior3js/src"

// ============================================================
// CONFIGURATION
// ============================================================

const MIN_RANGE = 3.5
const MAX_RANGE = 14

const MIN_DECISION_DURATION = 1.5
const MAX_DECISION_DURATION = 2.8

// ============================================================
// HELPERS
// ============================================================

function randomRange(min, max) {
    return min + Math.random() * (max - min)
}

function randomSign() {
    return Math.random() < 0.5 ? -1 : 1
}

// ============================================================
// BEHAVIOUR NODES
// ============================================================

// ------------------------------------------------------------
// RETREAT
// ------------------------------------------------------------

class RetreatIfTooClose extends b3.Action {

    constructor() {
        super({ name: "RetreatIfTooClose" })
    }

    tick(tick) {

        const { id, target, BossAI } = tick.target

        // Already retreating? Let it finish.
        if (BossAI.state[id] === 1 && BossAI.stateTimer[id] > 0) {
            return b3.SUCCESS
        }

        // Only retreat when genuinely too close.
        if (target.distance >= MIN_RANGE) {
            return b3.FAILURE
        }

        BossAI.state[id] = 1
        BossAI.stateTimer[id] = 0.65

        return b3.SUCCESS
    }
}

// ------------------------------------------------------------
// APPROACH
// ------------------------------------------------------------

class ApproachIfTooFar extends b3.Action {

    constructor() {
        super({ name: "ApproachIfTooFar" })
    }

    tick(tick) {

        const { id, target } = tick.target

        if (target.distance <= MAX_RANGE) {
            return b3.FAILURE
        }

        tick.target.BossAI.state[id] = 0

        tick.target.BossAI.stateTimer[id] = 0.25

        return b3.SUCCESS
    }
}

// ------------------------------------------------------------
// CHOOSE ORBIT
// ------------------------------------------------------------

class ChooseOrbit extends b3.Action {

    constructor() {
        super({ name: "ChooseOrbit" })
    }

    tick(tick) {

        const { id, BossAI } = tick.target

        if (BossAI.stateTimer[id] > 0) {
            return b3.FAILURE
        }

        BossAI.state[id] = 2

        // Occasionally reverse orbit direction.

        if (!BossAI.strafeDirection[id]) {
            BossAI.strafeDirection[id] = randomSign()
        } else if (Math.random() < 0.3) {
            BossAI.strafeDirection[id] *= -1
        }

        BossAI.stateTimer[id] = randomRange(
            MIN_DECISION_DURATION,
            MAX_DECISION_DURATION
        )

        return b3.SUCCESS
    }
}

// ------------------------------------------------------------
// MAINTAIN CURRENT MOVEMENT
// ------------------------------------------------------------

class MaintainMovement extends b3.Action {

    constructor() {
        super({ name: "MaintainMovement" })
    }

    tick() {
        return b3.SUCCESS
    }
}

// ============================================================
// BEHAVIOUR TREE
// ============================================================

const bossBehaviorTree = new b3.BehaviorTree()

bossBehaviorTree.root = new b3.Priority({

    children: [

        // Highest priority: avoid the player.

        new RetreatIfTooClose(),

        // Next: close the distance.

        new ApproachIfTooFar(),

        // Otherwise choose a new orbit when necessary.

        new ChooseOrbit(),

        // Continue current movement.

        new MaintainMovement(),

    ],

})

// ============================================================
// BLACKBOARDS
// ============================================================

const blackboards = new Map()

function getBlackboard(id) {

    if (!blackboards.has(id)) {
        blackboards.set(id, new b3.Blackboard())
    }

    return blackboards.get(id)
}

// ============================================================
// PUBLIC UPDATE
// ============================================================

export function updateBossBehavior(id, target, BossAI) {

    const blackboard = getBlackboard(id)

    bossBehaviorTree.tick(
        {
            id,
            target,
            BossAI,
        },
        blackboard
    )
}
