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

export const Asteroid = {
    active: new Uint8Array(MAX),
}

export const BossAI = {
    moveTimer: new Float32Array(MAX),
    shootTimer: new Float32Array(MAX),
    weapon: new Uint8Array(MAX),
    beamCycleTimer: new Float32Array(MAX),   
    beamActive: new Uint8Array(MAX),         
};

export const Spark = {
    size: new Float32Array(MAX),
    maxLife: new Float32Array(MAX),
    active: new Uint8Array(MAX),   // new
};

export const Bullet = {
    type: new Uint8Array(MAX),
    owner: new Uint8Array(MAX),
    bounces: new Uint8Array(MAX),   
    // render data cached at spawn time
    colorR: new Float32Array(MAX),
    colorG: new Float32Array(MAX),
    colorB: new Float32Array(MAX),

    active: new Uint8Array(MAX)
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
    detonated: new Uint8Array(MAX),  
};

export const StatusEffect = {
    frozen: new Float32Array(MAX),  
}

export const PlayerTag = {};
export const BulletTag = {};
export const SparkTag = {};
export const AsteroidTag = {};
export const BossTag = {};
export const HazardTag = {};

