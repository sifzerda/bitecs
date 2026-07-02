// src/ecs/spawn.js

import { addEntity, addComponent } from "bitecs";
import { world } from "../ecs/constants/world";
import { Position, Velocity, Rotation, Health, Lifetime, PlayerTag, BulletTag, AsteroidTag } from "./constants/components";

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

// ============= ======= ============//

export function spawnPlayer(x, y) {

    const id = addEntity(world)

    setPosition(id, x, y)
    addComponent(world, id, Velocity)
    addComponent(world, id, Rotation)
    addComponent(world, id, PlayerTag)
    setHealth(id, 100)
    
    return id
}

export function spawnBullet(x,y,rot){

    const id = addEntity(world);

    addComponent(world,id,Position);
    addComponent(world,id,Velocity);
    addComponent(world,id,Lifetime);
    addComponent(world,id,BulletTag);

    Position.x[id]=x;
    Position.y[id]=y;

    const speed=18;

    Velocity.x[id]=Math.sin(-rot)*speed;
    Velocity.y[id]=Math.cos(-rot)*speed;

    Lifetime.remaining[id]=1.2;

    return id;
}

export function spawnAsteroid(x, y) {

    const id = addEntity(world)

    setPosition(id, x, y)
    addComponent(world, id, Velocity)
    addComponent(world, id, AsteroidTag)
    setHealth(id, 20)

    Velocity.x[id] = (Math.random() - 0.5) * 2
    Velocity.y[id] = (Math.random() - 0.5) * 2

    return id

}