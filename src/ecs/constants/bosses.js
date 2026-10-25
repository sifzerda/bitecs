// src/ecs/constants/bosses.js
//
// ============================================================
// Boss roster
// ============================================================
//

export const BOSSES = [
    {
        key: "shotgun",
        name: "Space Cowboy",
        gun: { typeId: "01_shotgun", offsetX: 0.7, offsetY: 0.1, scale: 1.0, rotation: 0 },

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.6,
                engineGap: 0.3,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.6,
                gunGap: 0.7,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.6,
                gunGap: 0.7,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.6,
                gunGap: 0.7,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.6,
                gunGap: 0.7,
            },
        },

    },

    {
        key: "machinegun",
        name: "Rambo The Space Copter",
        gun: { typeId: "02_machinegun", offsetX: 0.7, offsetY: 0.58, scale: 1.0, rotation: 0 }, // mount.offsetX = 0.48

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -1.3,
                engineGap: 0.44,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 1.39,
                gunGap: 0.71,
            },

            beam: {
                offsetX: 0,
                offsetY: 1.39,
                gunGap: 0.71,
            },

            missile: {
                offsetX: 0,
                offsetY: 1.39,
                gunGap: 0.71,
            },

            thrower: {
                offsetX: 0,
                offsetY: 1.39,
                gunGap: 0.71,
            },
        },

    },

    {
        key: "cryogun",
        name: "The Flying Refrigerator",
        gun: { typeId: "03_cryogun", offsetX: 0.8, offsetY: -0.1, scale: 0.75, rotation: 0 }, // mount.offsetX = 0.48

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.94,
                engineGap: 0.23,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.95,
                gunGap: 0.8,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.95,
                gunGap: 0.8,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.95,
                gunGap: 0.8,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.95,
                gunGap: 0.8,
            },
        },

    },

    {
        key: "grenadegun",
        name: "War Machine",
        gun: { typeId: "04_grenadelauncher", offsetX: 0.8, offsetY: -0.31, scale: 1.0, rotation: 0 }, // mount.offsetX = 0.48

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -1.35,
                engineGap: 0.25,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.67,
                gunGap: 0.8,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.67,
                gunGap: 0.8,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.67,
                gunGap: 0.8,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.67,
                gunGap: 0.8,
            },
        },

    },

    {
        key: "acidthrowergun",
        name: "Space Tractor",
        gun: { typeId: "05_acidthrower", offsetX: 0.96, offsetY: -0.01, scale: 0.9, rotation: 0 }, // mount.offsetX = 0.48

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -1.04,
                engineGap: 0.4,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.7,
                engineGap: 0.96,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.7,
                engineGap: 0.96,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.7,
                engineGap: 0.96,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.7,
                engineGap: 0.96,
            },
        },

    },

    {
        key: "missilegun",
        name: "Rogue Mars Missiler",
        gun: { typeId: "06_missilelauncher", offsetX: 0.93, offsetY: -0.01, scale: 0.9, rotation: 0 }, // mount.offsetX = 0.48


        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -1.63,
                engineGap: 0.12,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.65,
                gunGap: 0.8,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.65,
                gunGap: 0.8,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.65,
                gunGap: 0.8,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.65,
                gunGap: 0.8,
            },
        },

    },

    {
        key: "flamethrowergun",
        name: "X-10 Space Dragon",
        gun: { typeId: "07_flamethrower", offsetX: 0.73, offsetY: -0.33, scale: 1.0, rotation: 0 }, // mount.offsetX = 0.48

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -1.23,
                engineGap: 0.23,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.69,
                gunGap: 0.73,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.69,
                gunGap: 0.73,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.69,
                gunGap: 0.73,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.69,
                gunGap: 0.73,
            },
        },

    },

    {
        key: "lasergun",
        name: "UFO",
        gun: { typeId: "08_lasergun", offsetX: 0.72, offsetY: -0.7, scale: 1.0, rotation: 0 }, // mount.offsetX = 0.48

        emission: {
            exhaust: {
                offsetX: 0,
                // flat wide saucer, near-zero cockpit offset — no pronounced
                // nose/tail, so pulled these in toward center vs the others
                offsetY: -1.56,
                engineGap: 0.23,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.45,
                gunGap: 0.72,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.45,
                gunGap: 0.72,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.45,
                gunGap: 0.72,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.45,
                gunGap: 0.72,
            },
        },

    },

    {
        key: "arcgun",
        name: "Electric SpaceProbe",
        gun: { typeId: "09_arcgun", offsetX: 1.24, offsetY: 0.44, scale: 1.5, rotation: 0 }, // mount.offsetX = 0.48

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -1.17,
                engineGap: 0.48,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 1.82,
                gunGap: 1.23,
            },

            beam: {
                offsetX: 0,
                offsetY: 1.82,
                gunGap: 1.23,
            },

            missile: {
                offsetX: 0,
                offsetY: 1.82,
                gunGap: 1.23,
            },

            thrower: {
                offsetX: 0,
                offsetY: 1.82,
                gunGap: 1.23,
            },
        },

    },

    {
        key: "plasmagun",
        name: "Starscream",
        gun: { typeId: "10_plasmagun" }, // mount.offsetX = 0.6

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -1.35,
                engineGap: 0.16,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.65,
                gunGap: 0.6,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.65,
                gunGap: 0.6,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.65,
                gunGap: 0.6,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.65,
                gunGap: 0.6,
            },
        },

    },

    {
        key: "octopus",
        isShip: false,
        gunVisible: false,
        health: 1500,
        hitRadius: 0.85,
    },


    {
        key: "eldritch",
        name: "Eldritch Swarm",
        isShip: false,
        gunVisible: false,
        health: 1800,
        hitRadius: 1.2,
    },



]

export const BOSS_INDEX_BY_KEY = Object.fromEntries(
    BOSSES.map((boss, index) => [boss.key, index])
)
