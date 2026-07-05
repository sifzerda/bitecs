// src/ecs/constants/weapons.js

export const WEAPONS = [
    {
        id: 0,
        name: "raygun",
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
        isMissile: true,
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
        isBeam: true,              // no ECS bullet entity at all — driven by laserState instead
        range: 30,
        damagePerSecond: 60,
        beamWidth: 0.11,
        tickSparkInterval: 0.05,
        color: "#ffe0ee",
        glowColor: "#ff0055",
        haloColor: "#ff0033",
    },

]

export function getWeapon(id) {
    return WEAPONS[id] ?? WEAPONS[0]
}