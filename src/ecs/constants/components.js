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
    type: new Uint8Array(MAX),      // weapon id
    owner: new Uint8Array(MAX),     // 0 = player, 1 = enemy
}

export const BULLET_OWNER = {
    PLAYER: 0,
    ENEMY: 1
}

export const PlayerTag = {};
export const BulletTag = {};
export const SparkTag = {};

export const ExhaustTag = {};
export const AsteroidTag = {};
export const BossTag = {};


