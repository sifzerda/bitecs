// src/ecs/constants/queries.js

import { query } from "bitecs";
import { world } from "./world";
import { Position, Velocity, Health, PlayerTag, BossTag, BossAI, BossType } from "./components.js"
import { BOSSES } from "./bosses.js"

export const playerQuery = () => query(world, [Position, PlayerTag])
export const bossQuery = () => query(world, [Position, Health, BossTag])
export const movingQuery = () => query(world, [Position, Velocity])
// Conventional ship AI/weapons/exhaust must not act on the octopus.
// Combat and HUD still use bossQuery(), which includes it.
export const bossAIQuery = () => query(world, [Position, Velocity, BossAI, BossTag]).filter(id => BOSSES[BossType.typeIndex[id]]?.isShip !== false)
