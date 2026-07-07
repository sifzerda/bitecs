// src/ecs/constants/weapons.js

export const WEAPONS = [
    {
        id: 0,
        name: "raygun",
        category: "bullet",
        damage: 10,
        maxBullets: 128,
        hitRadius: 0.5,
        fireRate: 0.15,
        speed: 18,
        lifetime: 1.2,
        projectileCount: 1,
        spreadAngle: 0,
        color: "#e8fff5",
        glowColor: "#66ffcc",
        haloColor: "#77ffdd",
    },
    {
        id: 1,
        name: "shotgun",
        category: "bullet",
        damage: 12,
        maxBullets: 128,
        hitRadius: 0.6,
        fireRate: 0.35,
        speed: 16,
        lifetime: 1.0,
        projectileCount: 3,
        spreadAngle: 0.20,
        color: "#fff2b0",
        glowColor: "#ffaa33",
        haloColor: "#ff8800",
    },
    {
        id: 2,
        name: "machinegun",
        category: "bullet",
        damage: 5,
        maxBullets: 128,
        hitRadius: 0.5,
        fireRate: 0.07,
        speed: 22,
        lifetime: 0.9,
        projectileCount: 1,
        spreadAngle: 0.05,   // tiny jitter, feels less precise at high fire rate
        color: "#c9e8ff",
        glowColor: "#5599ff",
        haloColor: "#3366ff",
    },

    {
        id: 3,
        name: "missilegun",
        damage: 30,
        category: "launcher",
        maxBullets: 128,
        hitRadius: 1.0,
        fireRate: 0.8,
        speed: 10,          // slower than bullets, turn rate does the work
        lifetime: 3.0,
        projectileCount: 1,
        spreadAngle: 0,
        color: "#ffaa00",
        glowColor: "#ff6600",
        haloColor: "#ff2200",
        turnRate: 3.0,       // radians/sec it can steer, only missiles use this
    },
    {
        id: 4,
        name: "lasergun",
        category: "beam",
        //    maxBullets: 128,
        hitRadius: 0.3,
        range: 30,
        damagePerSecond: 40,
        beamWidth: 0.11,
        tickSparkInterval: 0.05,
        color: "#ffe0ee",
        glowColor: "#ff0055",
        haloColor: "#ff0033",
    },

    {
        id: 5,
        name: "grenadegun",
        category: "launcher",
        explosive: true,          // triggers AOE explosion instead of single-target damage
        explosionRadius: 2.5,
        damage: 25,               // full damage to everything caught in the explosion radius
        maxBullets: 32,           // low count — these are slow, one-at-a-time weapons
        hitRadius: 0.6,           // still used for the initial "did it hit something" check
        fireRate: 0.9,
        speed: 12,
        lifetime: 1.6,            // expires (and explodes) if it doesn't hit anything first
        projectileCount: 1,
        spreadAngle: 0,
        color: "#ffcf80",
        glowColor: "#ff9933",
        haloColor: "#ff7700",
    },

    {
        id: 6,
        name: "darkmattergun",
        category: "launcher",
        leavesHazard: true,       // on hit or expiry, drops a static damage cloud instead of direct damage
        damage: 0,                // no direct hit damage — the cloud does the work
        hazardRadius: 3.0,
        hazardDamage: 6,
        hazardTickInterval: 0.5,
        hazardDuration: 4.0,
        maxBullets: 32,
        hitRadius: 0.5,
        fireRate: 1.0,
        speed: 14,
        lifetime: 2.0,
        projectileCount: 1,
        spreadAngle: 0,
        color: "#c9a3ff",
        glowColor: "#7a33ff",
        haloColor: "#4d0099",
    },
    {
        id: 7,
        name: "acidsprayer",
        category: "thrower",
        leavesHazard: true,
        damage: 3,                 // small direct tick on impact, puddle does the rest
        hazardRadius: 1.5,
        hazardDamage: 4,
        hazardTickInterval: 0.3,
        hazardDuration: 3.0,
        maxBullets: 96,
        hitRadius: 0.4,
        fireRate: 0.12,             // fast fire rate to feel like a "spray"
        speed: 15,
        lifetime: 0.8,
        projectileCount: 1,
        spreadAngle: 0.08,
        color: "#ccff66",
        glowColor: "#99ff00",
        haloColor: "#669900",
    },

    {
        id: 8,
        name: "clustercannon",
        category: "bullet",
        splitsInto: 4,              // fragments spawned on split
        splitWeapon: 2,             // fragments use machinegun's stats/visuals — avoids duplicating a whole weapon def
        damage: 14,
        maxBullets: 32,
        hitRadius: 0.6,
        fireRate: 0.6,
        speed: 14,
        lifetime: 0.9,               // splits when this runs out, OR on first hit — whichever comes first
        projectileCount: 1,
        spreadAngle: 0,
        color: "#ffd9a0",
        glowColor: "#ff9900",
        haloColor: "#cc6600",
    },

    {
        id: 9,
        name: "proximityminelayer",
        category: "mine",           // new category — dropped instantly at ship position, not fired forward
        hazardRadius: 2.0,
        hazardDamage: 40,           // mines hit hard since they're a deliberate placement, not spam-fire
        hazardTickInterval: 999,    // effectively "detonate once" — see armed-check below
        hazardDuration: 8.0,
        fireRate: 1.0,
        color: "#ff6666",
        glowColor: "#ff2222",
        haloColor: "#aa0000",
    },

    {
        id: 10,
        name: "cryocannon",
        category: "bullet",
        freezeDuration: 2.5,
        damage: 4,                  // low direct damage — the value is in the freeze setup
        maxBullets: 64,
        hitRadius: 0.5,
        fireRate: 0.3,
        speed: 17,
        lifetime: 1.2,
        projectileCount: 1,
        spreadAngle: 0,
        color: "#c9f5ff",
        glowColor: "#66e0ff",
        haloColor: "#0099cc",
    },

    {
        id: 11,
        name: "arcgun",
        category: "bullet",
        damage: 10,
        chainCount: 3,        // additional asteroids it jumps to after the first hit
        chainRange: 6,
        maxBullets: 64,
        hitRadius: 0.5,
        fireRate: 0.4,
        speed: 20,
        lifetime: 1.0,
        projectileCount: 1,
        spreadAngle: 0,
        color: "#e0d9ff",
        glowColor: "#9966ff",
        haloColor: "#6600ff",
    },

    {
        id: 12,
        name: "particlebeam",
        category: "beam",
        range: 25,
        damagePerSecond: 15,        // starting DPS
        maxDamagePerSecond: 60,     // DPS after fully ramped
        rampTime: 2.0,              // seconds of continuous lock to reach max DPS
        beamWidth: 0.15,
        color: "#ffffff",
        glowColor: "#88ddff",
        haloColor: "#3399ff",
    },

    {
        id: 13,
        name: "prismbeam",
        category: "beam",
        range: 20,
        damagePerSecond: 18,
        beamCount: 3,
        beamSpread: 0.35,
        tickSparkInterval: 0.08,
        beamWidth: 0.08,
        color: "#ffe0ff",
        glowColor: "#ff66ff",
        haloColor: "#cc00cc",
    },

    {
        id: 14,
        name: "flamethrower",
        category: "thrower",
        range: 6,                 // short range — flamethrowers are a close-quarters weapon
        coneAngle: 0.6,            // radians, full cone width
        damagePerSecond: 35,       // at point-blank; falls off with distance (see flameSystem)
        tickSparkInterval: 0.06,
        color: "#ffcc66",
        glowColor: "#ff6600",
        haloColor: "#ff2200",
    },

]

export function getWeapon(id) {
    return WEAPONS[id] ?? WEAPONS[0]
}