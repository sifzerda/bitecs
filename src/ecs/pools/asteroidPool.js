// src/ecs/pools/asteroidPool.js

const pool = [];

export function acquireAsteroid() {

    return pool.pop() || {

        asteroid: true,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 1,
        size: 3,
        rotation: 0,
        rotationSpeed: 0,
        wrap: true,

    };

}

export function releaseAsteroid(asteroid) {

    asteroid.asteroid = false;

    asteroid.x = 0;
    asteroid.y = 0;
    asteroid.vx = 0;
    asteroid.vy = 0;
    asteroid.radius = 1;
    asteroid.size = 3;
    asteroid.rotation = 0;
    asteroid.rotationSpeed = 0;

    pool.push(asteroid);

}