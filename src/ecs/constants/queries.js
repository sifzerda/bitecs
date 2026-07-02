// src/ecs/constants/queries.js

import { query } from "bitecs";
import { world } from "./world";
import {
    Position,
    Velocity,
    PlayerTag,
    BulletTag,
    AsteroidTag,
    BossTag,
    Lifetime,
    Health
} from "./components";

export const playerQuery = () => query(world, [Position, PlayerTag])
export const bulletQuery = () => query(world, [Position, BulletTag, Lifetime])
export const asteroidQuery = () => query(world, [Position, Health, AsteroidTag])
export const bossQuery = () => query(world, [Position, Health, BossTag])
export const movingQuery = () => query(world, [Position, Velocity])