// src/state/gameLoop.js

import {
    octopusBossSystem,
} from "../ecs/systems/octopusBossSystem.js"

import playerControlSystem from "../ecs/systems/playerControlSystem.js"

import { movementSystem } from "../ecs/systems/movement.js"
import { collisionSystem } from "../ecs/systems/collisionSystem.js"
import { boundsSystem } from "../ecs/systems/bounds.js"
import { combatSystem } from "../ecs/combat/combatSystem.js"
import { waveSystem } from "../ecs/waves/waveSystem.js"
import { trailSystem } from "../ecs/systems/trailSystem.js"

import {
    invulnerabilitySystem,
} from "../ecs/systems/invulnerabilitySystem.js"

import {
    asteroidBehaviourSystem,
} from "../ecs/asteroids/asteroidBehaviourSystem.js"

import {
    laserSystem,
} from "../ecs/weapons/weaponSystems/laserSystem.js"

import {
    missileSystem,
} from "../ecs/weapons/weaponSystems/missileSystem.js"

import {
    throwerSystem,
} from "../ecs/weapons/weaponSystems/throwerSystem.js"

import {
    updateArcs,
} from "../ecs/weapons/weaponState/arcState.js"

import {
    statusEffectSystem,
} from "../ecs/systems/statusEffectSystem.js"

import {
    updateBossController,
} from "../ecs/bosses/bossController.js"

import { exhaustEmitter } from "../fx/gpu/exhaustEmitter.js"
import { updateEffects } from "../fx/index.js"

import {
    clearSpatialGrids,
    insertAsteroid,
    insertBoss,
} from "../ecs/constants/spatialGrid.js"

import {
    activeAsteroids,
} from "../ecs/pools/asteroidPool.js"

import { bossQuery } from "../ecs/constants/queries.js"

import {
    useGameStore,
    SCREEN,
} from "../../store/gameStore.js"

import { startState } from "./startState.js"

import {
    encounterSystem,
} from "../ecs/systems/encounterSystem.js"

import {
    resetWeaponVisuals,
} from "./resetWeaponVisuals.js"

import {
    updateCombatScoring,
} from "../ecs/combat/combatScoring.js"

import {
    nearMissSystem,
} from "../ecs/combat/nearMissSystem.js"

import {
    updateImpactFeedback,
} from "../ecs/combat/impactFeedback.js"

// ============================================================
// STATE
// ============================================================

function playing() {
    const state = useGameStore.getState()

    return (
        state.screen === SCREEN.PLAY &&
        !state.paused
    )
}

function fighting() {
    return (
        playing() &&
        startState.encounterPhase === "active"
    )
}

// ============================================================
// SPATIAL GRID
// ============================================================

// Index current asteroid and boss positions.
//
// Octopus anchoring is handled by octopusBossSystem(),
// which runs before the collision grid is built.

function rebuildSpatialGrid() {
    clearSpatialGrids()

    for (
        let i = 0;
        i < activeAsteroids.length;
        i++
    ) {
        insertAsteroid(activeAsteroids[i])
    }

    const bosses = bossQuery()

    for (let i = 0; i < bosses.length; i++) {
        insertBoss(bosses[i])
    }
}

// ============================================================
// EFFECTS
// ============================================================

function effects(dt) {
    trailSystem()
    updateArcs(dt)
    exhaustEmitter()
    updateEffects(dt)
}

// ============================================================
// MAIN LOOP
// ============================================================

export function gameLoop(shootState, dt) {
    if (!playing()) return

    updateImpactFeedback(dt)
    waveSystem()

    // --------------------------------------------------------
    // CLEARING PHASE
    // --------------------------------------------------------

    if (startState.encounterPhase === "clearing") {
        resetWeaponVisuals()

        movementSystem()
        boundsSystem()

        effects(dt)
        encounterSystem(dt)

        return
    }

    if (!fighting()) return

    // --------------------------------------------------------
    // SCORING
    // --------------------------------------------------------

    updateCombatScoring(dt)

    // --------------------------------------------------------
    // PLAYER AND AI
    // --------------------------------------------------------

    invulnerabilitySystem()
    playerControlSystem(shootState)

    updateBossController()
    asteroidBehaviourSystem()

    if (!fighting()) return

    // --------------------------------------------------------
    // MISSILE GUIDANCE
    // --------------------------------------------------------

    // Missile targeting currently scans the active entity
    // pools directly, so no spatial rebuild is required here.

    missileSystem()

    // --------------------------------------------------------
    // MOVEMENT
    // --------------------------------------------------------

    movementSystem()
    boundsSystem()
    octopusBossSystem()

    if (!fighting()) return

    // --------------------------------------------------------
    // COLLISION GRID
    // --------------------------------------------------------

    // Build using positions after movement and bounds.

    rebuildSpatialGrid()

    collisionSystem()

    if (!fighting()) return

    // --------------------------------------------------------
    // NEAR MISSES
    // --------------------------------------------------------

    nearMissSystem(dt)

    // Collision resolution can displace entities.
    boundsSystem()

    // --------------------------------------------------------
    // COMBAT GRID
    // --------------------------------------------------------

    // Refresh after collision separation and wrapping.
    // Combat, laser and thrower share this snapshot.

    rebuildSpatialGrid()

    combatSystem()

    if (fighting()) laserSystem()
    if (fighting()) throwerSystem()
    if (fighting()) statusEffectSystem()

    // --------------------------------------------------------
    // EFFECTS
    // --------------------------------------------------------

    if (playing()) effects(dt)
}
