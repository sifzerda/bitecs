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
    targetRotation: new Float32Array(MAX),
};

export const BossType = {
    typeIndex: new Uint8Array(MAX),
};

// Phase: 0 = hidden, 1 = emerging, 2 = active, 3 = retracting
export const Tentacle = {
    phase: new Uint8Array(MAX),
    timer: new Float32Array(MAX),
    deployT: new Float32Array(MAX),      // 0 = fully retracted, 1 = fully emerged
    edge: new Uint8Array(MAX),           // 0 = left, 1 = right, 2 = top, 3 = bottom
    along: new Float32Array(MAX),        // -0.5..0.5 fraction along that edge
    tipRadius: new Float32Array(MAX),    // hurtbox/hitbox radius at the tip
    damage: new Float32Array(MAX),
    hitCooldown: new Float32Array(MAX),  // seconds until this tentacle can hit the player again
};

export const Octopus = {
    active: new Uint8Array(10000), // or whatever your MAX_ENTITIES is
}

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
export const AsteroidTag = {};
export const BossTag = {};
export const HazardTag = {};

export const TentacleTag = {};
export const TentacleBossTag = {};
export const OctopusTag = {};

