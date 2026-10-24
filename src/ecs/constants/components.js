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

export const Invulnerability = {
    remaining: new Float32Array(MAX),
};

export const Lifetime = {
    remaining: new Float32Array(MAX),
};

export const Asteroid = {
    active: new Uint8Array(MAX),
    radius: new Float32Array(MAX),
    scale: new Float32Array(MAX),
}

export const BossAI = {
    moveTimer: new Float32Array(MAX),
    shootTimer: new Float32Array(MAX),
    weapon: new Uint8Array(MAX),
    beamCycleTimer: new Float32Array(MAX),
    beamActive: new Uint8Array(MAX),
    targetRotation: new Float32Array(MAX),
    burstRemaining: new Uint8Array(MAX),
    burstGapTimer: new Float32Array(MAX),
    // ---------------------------------------------------------
    // Tactical combat AI
    // ---------------------------------------------------------
    // 0 = attack
    // 1 = evade
    // 2 = strafe
    // 3 = reposition
    state: new Uint8Array(MAX),
    // How long current tactical decision lasts
    stateTimer: new Float32Array(MAX),
    // Desired movement direction
    moveRotation: new Float32Array(MAX),
    // Randomly chosen orbit direction
    strafeDirection: new Float32Array(MAX),
    // Random personality variation per maneuver
    aggression: new Float32Array(MAX),
    // Time since last successful shot
    attackTimer: new Float32Array(MAX),
    // Prevents instant repeated state switching
    decisionCooldown: new Float32Array(MAX),

    aimError: new Float32Array(MAX),
    aimErrorTimer: new Float32Array(MAX),
};

export const BossType = {
    typeIndex: new Uint8Array(MAX),
};

export const Bullet = {
    type: new Uint8Array(MAX),
    owner: new Uint8Array(MAX),
    source: new Int32Array(MAX),
    colorR: new Float32Array(MAX),
    colorG: new Float32Array(MAX),
    colorB: new Float32Array(MAX),

    active: new Uint8Array(MAX),

    deflected: new Uint8Array(MAX), // 0 = normal, 1 = deflected
}

export const Arc = {
    active: new Uint8Array(MAX),
    life: new Float32Array(MAX),
    maxLife: new Float32Array(MAX),
    intensity: new Float32Array(MAX),   // new
    colorR: new Float32Array(MAX),
    colorG: new Float32Array(MAX),
    colorB: new Float32Array(MAX),
    pointCount: new Uint8Array(MAX),
    version: new Uint16Array(MAX),      // was Uint8Array
}

export const BULLET_OWNER = {
    PLAYER: 0,
    ENEMY: 1
}

export const StatusEffect = {
    frozen: new Float32Array(MAX),
    corrosionRemaining: new Float32Array(MAX),
    corrosionDamage: new Float32Array(MAX),
};

export const PlayerTag = {};
export const BulletTag = {};
export const AsteroidTag = {};
export const BossTag = {};

export const ARC_MAX_POINTS = 32

export const ArcPointsX = []
export const ArcPointsY = []

for (let i = 0; i < MAX; i++) {
    ArcPointsX[i] = new Float32Array(ARC_MAX_POINTS)
    ArcPointsY[i] = new Float32Array(ARC_MAX_POINTS)
}