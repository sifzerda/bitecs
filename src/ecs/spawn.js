// src/ecs/spawn.js

import { addEntity, addComponent } from "bitecs";
import { world } from "../ecs/constants/world";
import { Position, Velocity, Rotation, Health, Lifetime, PlayerTag, BulletTag, AsteroidTag } from "./components";

export function spawnPlayer(x,y){

    const id = addEntity(world);

    addComponent(world,id,Position);
    addComponent(world,id,Velocity);
    addComponent(world,id,Rotation);
    addComponent(world,id,Health);
    addComponent(world,id,PlayerTag);

    Position.x[id]=x;
    Position.y[id]=y;

    Health.current[id]=100;
    Health.max[id]=100;

    return id;
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

export function spawnAsteroid(x,y){

    const id=addEntity(world);

    addComponent(world,id,Position);
    addComponent(world,id,Velocity);
    addComponent(world,id,Health);
    addComponent(world,id,AsteroidTag);

    Position.x[id]=x;
    Position.y[id]=y;

    Velocity.x[id]=(Math.random()-0.5)*2;
    Velocity.y[id]=(Math.random()-0.5)*2;

    Health.current[id]=20;
    Health.max[id]=20;

    return id;
}