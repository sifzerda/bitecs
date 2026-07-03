// src/ecs/spawn.js

import { addEntity, addComponent } from "bitecs";
import { world } from "./constants/world"
import {
    Position,
    Velocity,
    Rotation,
    Health,
    Lifetime,
    PlayerTag,
    BulletTag,
    Spark,
    SparkTag,
    ExhaustTag,
    AsteroidTag,
    BossTag,
    BossAI,
    BossBulletTag
} from "./constants/components";
import { gameState } from "../state/gameState";

// ============= helpers ============//

function setPosition(id, x, y) {
    addComponent(world, id, Position)
    Position.x[id] = x
    Position.y[id] = y
}

function setHealth(id, hp) {
    addComponent(world, id, Health)
    Health.current[id] = hp
    Health.max[id] = hp
}

// ============= Player Ship ============//

export function spawnPlayer(x, y) {

    const id = addEntity(world)

    setPosition(id, x, y)
    addComponent(world, id, Velocity)
    addComponent(world, id, Rotation)
    addComponent(world, id, PlayerTag)
    setHealth(id, 100)

    return id
}

// ============= Bullets ============//

export function spawnBullet(x, y, rot) {

    const id = addEntity(world);

    addComponent(world, id, Position);
    addComponent(world, id, Velocity);
    addComponent(world, id, Lifetime);
    addComponent(world, id, BulletTag);

    Position.x[id] = x;
    Position.y[id] = y;

    const speed = 18;

    Velocity.x[id] = Math.sin(-rot) * speed;
    Velocity.y[id] = Math.cos(-rot) * speed;

    Lifetime.remaining[id] = 1.2;

    return id;
}

// ============= Sparks ============//

function spawnSpark(x, y, speed, size, life) {

    const id = addEntity(world)

    addComponent(world, id, Position)
    addComponent(world, id, Velocity)
    addComponent(world, id, Lifetime)
    addComponent(world, id, Spark)
    addComponent(world, id, SparkTag)

    Position.x[id] = x
    Position.y[id] = y

    const angle = Math.random() * Math.PI * 2
    const s = speed * (0.4 + Math.random() * 0.9)

    Velocity.x[id] = Math.cos(angle) * s
    Velocity.y[id] = Math.sin(angle) * s

    Lifetime.remaining[id] = life
    Spark.maxLife[id] = life
    Spark.size[id] = size

    return id
}

export function spawnSparkBurst(x, y, options = {}) {

    const count = options.count ?? 28        // was 16 — denser burst
    const speed = options.speed ?? 10        // was 6 — sparks fly further/faster
    const big = options.big ?? false

    // one oversized, ultra-short-lived flash spark for the initial "punch"
    {
        const id = addEntity(world)
        addComponent(world, id, Position)
        addComponent(world, id, Velocity)
        addComponent(world, id, Lifetime)
        addComponent(world, id, Spark)
        addComponent(world, id, SparkTag)

        Position.x[id] = x
        Position.y[id] = y
        Velocity.x[id] = 0
        Velocity.y[id] = 0

        const life = 0.1
        Lifetime.remaining[id] = life
        Spark.maxLife[id] = life
        Spark.size[id] = (big ? 1.8 : 1.0)   // much bigger than regular embers
    }

    for (let i = 0; i < count; i++) {

        const id = addEntity(world)

        addComponent(world, id, Position)
        addComponent(world, id, Velocity)
        addComponent(world, id, Lifetime)
        addComponent(world, id, Spark)
        addComponent(world, id, SparkTag)

        Position.x[id] = x
        Position.y[id] = y

        const angle = Math.random() * Math.PI * 2
        const s = speed * (0.3 + Math.random() * 1.1)   // wider speed variance -> more chaotic spread

        Velocity.x[id] = Math.cos(angle) * s
        Velocity.y[id] = Math.sin(angle) * s

        const life = 0.3 + Math.random() * 0.45          // was 0.25-0.55 -> lives a bit longer, more visible travel
        const size = (0.1 + Math.random() * 0.22) * (big ? 2.0 : 1.3)   // bigger base + bigger "big" multiplier

        Lifetime.remaining[id] = life
        Spark.maxLife[id] = life
        Spark.size[id] = size
    }
}

// ============= Exhaust ============//

export function spawnExhaust(x, y, rot) {

    const id = addEntity(world);

    addComponent(world, id, Position);
    addComponent(world, id, Velocity);
    addComponent(world, id, Lifetime);
    addComponent(world, id, ExhaustTag);

    Position.x[id] = x;
    Position.y[id] = y;

    const speed = 18;

    Velocity.x[id] = Math.sin(-rot) * speed;
    Velocity.y[id] = Math.cos(-rot) * speed;

    Lifetime.remaining[id] = 1.2;

    return id;
}

// ============= Asteroids ============//

export function spawnAsteroid(x, y) {

    const id = addEntity(world)

    setPosition(id, x, y)

    addComponent(world, id, Velocity)
    addComponent(world, id, AsteroidTag)   // ONLY this
    setHealth(id, 20)

    Velocity.x[id] = (Math.random() - 0.5) * 2
    Velocity.y[id] = (Math.random() - 0.5) * 2

    return id
}

// ============= Boss ============//

export function spawnBoss() {

    const id = addEntity(world)

    addComponent(world, id, Position)
    addComponent(world, id, Velocity)
    addComponent(world, id, Health)
    addComponent(world, id, BossTag)
    addComponent(world, id, BossAI)

    Position.x[id] = 0
    Position.y[id] = 0

    Velocity.x[id] = 0
    Velocity.y[id] = 0

    Health.current[id] = 300
    Health.max[id] = 300

    BossAI.moveTimer[id] = 0     // pick a direction immediately
    BossAI.shootTimer[id] = 1    // small delay before first shot

    gameState.bossAlive = true

    return id
}

// ============= Boss Bullets ============//

export function spawnBossBullet(x, y, vx, vy) {

    const id = addEntity(world)

    addComponent(world, id, Position)
    addComponent(world, id, Velocity)
    addComponent(world, id, Lifetime)
    addComponent(world, id, BossBulletTag)

    Position.x[id] = x
    Position.y[id] = y

    Velocity.x[id] = vx
    Velocity.y[id] = vy

    Lifetime.remaining[id] = 3.0

    return id
}