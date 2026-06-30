// src/ecs/spawnEnemyBullet.js

import { addEntity, addComponent } from "bitecs";
import { world } from "../ecs/constants/world";
import { Position, Velocity, Lifetime, EnemyBulletTag } from "./components";

export function spawnEnemyBullet(x, y, angle) {

    const id = addEntity(world);

    addComponent(world, id, Position);
    addComponent(world, id, Velocity);
    addComponent(world, id, Lifetime);
    addComponent(world, id, EnemyBulletTag);

    Position.x[id] = x;
    Position.y[id] = y;

    const speed = 9; // slower than player bullets (18), so they're dodgeable

    Velocity.x[id] = Math.cos(angle) * speed;
    Velocity.y[id] = Math.sin(angle) * speed;

    Lifetime.remaining[id] = 3.0; // longer range than player bullets

    return id;
}