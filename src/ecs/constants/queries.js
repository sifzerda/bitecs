// src/ecs/constants/queries.js

import { query } from "bitecs";
import { world } from "./world";
import {
    Position,
    Velocity,
    Lifetime,
    Health,

    PlayerTag,
    Bullet,
    BulletTag,
    Spark,
    SparkTag,
    AsteroidTag,

    BossTag,
    BossAI,

    HazardZone,
    HazardTag,

    Tentacle,
    TentacleTag,
    TentacleBossTag,
} from "./components";

export const playerQuery = () => query(world, [Position, PlayerTag])
export const bossQuery = () => query(world, [Position, Health, BossTag])
export const movingQuery = () => query(world, [Position, Velocity])

export const bossAIQuery = () => query(world, [Position, Velocity, BossAI, BossTag])
export const hazardQuery = () => query(world, [Position, HazardZone, HazardTag, Lifetime])

export const tentacleQuery = () =>
    query(world, [Position, Health, TentacleBossTag])

export const tentacleBossQuery = () =>
    query(world, [Position, Health, TentacleBossTag])