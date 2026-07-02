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
    ExhaustTag, 
    AsteroidTag, 
    BossTag, 
    BossAI, 
    BossBulletTag 
} from "./constants/components";
import { gameStats } from "../state/gameStats";

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

// ============= Exhaust ============//

export function spawnExhaust(x,y,rot){

    const id = addEntity(world);

    addComponent(world,id,Position);
    addComponent(world,id,Velocity);
    addComponent(world,id,Lifetime);
    addComponent(world,id,ExhaustTag);

    Position.x[id]=x;
    Position.y[id]=y;

    const speed=18;

    Velocity.x[id]=Math.sin(-rot)*speed;
    Velocity.y[id]=Math.cos(-rot)*speed;

    Lifetime.remaining[id]=1.2;

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

    gameStats.bossAlive = true

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