// src/ecs/spawnUfo.js

import { addEntity, addComponent } from "bitecs";
import { world } from "../ecs/constants/world";
import { Position, Velocity, UfoTag, UfoHealth } from "./components";

export function spawnUfo(x, y) {

    const id = addEntity(world);

    addComponent(world, id, Position);
    addComponent(world, id, Velocity);
    addComponent(world, id, UfoHealth);
    addComponent(world, id, UfoTag);

    Position.x[id] = x;
    Position.y[id] = y;

    Velocity.x[id] = 0;
    Velocity.y[id] = 0;

    UfoHealth.current[id] = 100;
    UfoHealth.max[id] = 100;

    return id;
}