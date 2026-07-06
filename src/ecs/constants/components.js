//src/ecs/constants/components.js

const MAX = 10000;

export const Position = {
    x: new Float32Array(MAX),
    y: new Float32Array(MAX),
};

export const Velocity = {
    x: new Float32Array(MAX),
    y: new Float32Array(MAX),
};

export const Rotation = new Float32Array(MAX);

export const Health = {
    current: new Float32Array(MAX),
    max: new Float32Array(MAX),
};

export const Lifetime = {
    remaining: new Float32Array(MAX),
};

export const BossAI = {
    moveTimer: new Float32Array(MAX),
    shootTimer: new Float32Array(MAX),
    weapon: new Uint8Array(MAX),
};

export const Spark = {
    size: new Float32Array(MAX),
    maxLife: new Float32Array(MAX),
};

export const Bullet = {
    type: new Uint8Array(MAX),
    owner: new Uint8Array(MAX),
    bounces: new Uint8Array(MAX),   // remaining bounces before the bullet dies normally
}

export const BULLET_OWNER = {
    PLAYER: 0,
    ENEMY: 1
}

export const HazardZone = {
    weaponType: new Uint8Array(MAX),
    owner: new Uint8Array(MAX),
    target: new Int32Array(MAX),
    tickTimer: new Float32Array(MAX),
    detonated: new Uint8Array(MAX),   // add this — 0/1 flag for one-shot hazards like mines
};

export const StatusEffect = {
    frozen: new Float32Array(MAX),   // seconds remaining frozen; 0 = not frozen
}

export const Drone = {
    orbitAngle: new Float32Array(MAX),
    orbitRadius: new Float32Array(MAX),
    orbitSpeed: new Float32Array(MAX),
    shootTimer: new Float32Array(MAX),
    weapon: new Uint8Array(MAX),     // weapon id the drone fires (e.g. raygun)
    fireRate: new Float32Array(MAX), // read from the orbitaldrones weapon entry at spawn time
    range: new Float32Array(MAX),    // read from the orbitaldrones weapon entry at spawn time
}

export const PlayerTag = {};
export const BulletTag = {};
export const SparkTag = {};

export const ExhaustTag = {};
export const AsteroidTag = {};
export const BossTag = {};
export const HazardTag = {};
export const DroneTag = {};

