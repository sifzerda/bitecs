//src/state/resetLevel.js

import { query, removeEntity } from "bitecs";

import { world } from "../ecs/constants/world.js";
import {
    Position,
    AsteroidTag,
    BulletTag,
} from "../ecs/constants/components.js";

import {
    activeAsteroids,
    releaseAsteroidEntity,
} from "../ecs/pools/asteroidPool.js";

import {
    activeBullets,
    releaseBulletEntity,
} from "../ecs/pools/bulletPool.js";

import { clearEffects } from "../fx/effects.js";
import { sparkPool } from "../fx/gpu/SparkEmitter.js";
import { explosionPool } from "../fx/gpu/ExplosionEmitter.js";

function clearTypedPool(pool) {
    while (pool.activeCount > 0) {
        pool.kill(pool.activeIds[pool.activeCount - 1]);
    }

    pool.dirty = true;
}

export function resetLevelWorld() {
    // Release pooled entities properly so their slots can be reused.
    while (activeAsteroids.length > 0) {
        releaseAsteroidEntity(
            activeAsteroids[activeAsteroids.length - 1]
        );
    }

    while (activeBullets.length > 0) {
        releaseBulletEntity(
            activeBullets[activeBullets.length - 1]
        );
    }

    // Keep all preallocated asteroid and bullet pool entities alive.
    const pooledIds = new Set([
        ...query(world, [AsteroidTag]),
        ...query(world, [BulletTag]),
    ]);

    // Remove the player, bosses, and other positioned gameplay entities.
    // Query results are copied before removal so iteration is safe.
    const positionedEntities = [...query(world, [Position])];

    for (const id of positionedEntities) {
        if (!pooledIds.has(id)) {
            removeEntity(world, id);
        }
    }

    // Clear GPU effect pools.
    clearTypedPool(sparkPool);
    clearTypedPool(explosionPool);

    // Clear any additional effects whose managers implement clear().
    clearEffects();

    // Avoid carrying timing state into the next encounter.
    world.time.delta = 0;
    world.time.elapsed = 0;
}
