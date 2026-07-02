// src/ecs/constants/queries.js

import { query } from "bitecs";
import { world } from "./world";
import {
    Position,
    Velocity,
    PlayerTag,
    BulletTag,
    ExhaustTag,
    AsteroidTag,
    BossTag,
    Lifetime,
    Health,
    BossBulletTag,
    BossAI
} from "./components";

export const playerQuery = () => query(world, [Position, PlayerTag])
export const bulletQuery = () => query(world, [Position, Velocity, BulletTag, Lifetime])
export const asteroidQuery = () => query(world, [Position, Health, AsteroidTag])
export const bossQuery = () => query(world, [Position, Health, BossTag])
export const movingQuery = () => query(world, [Position, Velocity])
export const exhaustQuery = () => query(world, [Position, ExhaustTag, Lifetime])
export const bossAIQuery = () => query(world, [Position, Velocity, BossAI, BossTag])
export const bossBulletQuery = () => query(world, [Position, BossBulletTag, Lifetime])
