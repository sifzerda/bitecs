// src/ecs/constants/queries.js

import { query } from "bitecs";
import { world } from "./world";
import {
    Position,
    Velocity,
    PlayerTag,
    Bullet,
    BulletTag,
    Spark,
    SparkTag,
    AsteroidTag,
    BossTag,
    Lifetime,
    Health,
    BossAI,
    HazardZone,
    HazardTag,
    Drone,
    DroneTag,
} from "./components";

export const playerQuery = () => query(world, [Position, PlayerTag])
export const bulletQuery = () => query(world, [Position, Velocity, Bullet, BulletTag, Lifetime])
export const sparkQuery = () => query(world, [Position, Velocity, Spark, SparkTag, Lifetime])
export const asteroidQuery = () => query(world, [Position, Health, AsteroidTag])
export const bossQuery = () => query(world, [Position, Health, BossTag])
export const movingQuery = () => query(world, [Position, Velocity])
 
export const bossAIQuery = () => query(world, [Position, Velocity, BossAI, BossTag])
export const hazardQuery = () => query(world, [Position, HazardZone, HazardTag, Lifetime])
export const droneQuery = () => query(world, [Position, Drone, DroneTag])
 
