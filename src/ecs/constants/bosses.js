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
        gun: { typeId: "01_shotgun" }, 

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.60,
                engineGap: 0.15,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.5,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.5,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.5,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.5,
            },
        },

    },

    {
        key: "machinegun",
        name: "Rambo The Space Copter",
        gun: { typeId: "02_machinegun" }, // mount.offsetX = 0.48

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.62,
                engineGap: 0.08,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.62,
                gunGap: 0.48,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.62,
                gunGap: 0.48,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.62,
                gunGap: 0.48,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.62,
                gunGap: 0.48,
            },
        },

    },

    {
        key: "cryogun",
        name: "The Flying Refrigerator",
        gun: { typeId: "03_cryogun" }, // mount.offsetX = 0.8

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.58,
                engineGap: 0.22,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.8,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.8,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.8,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.8,
            },
        },

    },

    {
        key: "grenadegun",
        name: "War Machine",
        gun: { typeId: "04_grenadelauncher" }, // mount.offsetX = 0.8

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.70,
                engineGap: 0.16,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.75,
                gunGap: 0.8,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.75,
                gunGap: 0.8,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.75,
                gunGap: 0.8,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.75,
                gunGap: 0.8,
            },
        },

    },

    {
        key: "acidthrowergun",
        name: "Space Tractor",
        gun: { typeId: "05_acidthrower" }, // mount.offsetX = 0.9

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.55,
                engineGap: 0.14,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.50,
                gunGap: 0.9,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.50,
                gunGap: 0.9,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.50,
                gunGap: 0.9,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.50,
                gunGap: 0.9,
            },
        },

    },

    {
        key: "missilegun",
        name: "Rogue Mars Missiler",
        gun: { typeId: "06_missilelauncher" }, // mount.offsetX = 0.8

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.65,
                engineGap: 0.15,
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
        gun: { typeId: "07_flamethrower" }, // mount.offsetX = 0.5

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.65,
                engineGap: 0.15,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.5,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.5,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.5,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.60,
                gunGap: 0.5,
            },
        },

    },

    {
        key: "lasergun",
        name: "UFO",
        gun: { typeId: "08_lasergun" }, // mount.offsetX = 0.8

        emission: {
            exhaust: {
                offsetX: 0,
                // flat wide saucer, near-zero cockpit offset — no pronounced
                // nose/tail, so pulled these in toward center vs the others
                offsetY: -0.45,
                engineGap: 0.22,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.45,
                gunGap: 0.8,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.45,
                gunGap: 0.8,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.45,
                gunGap: 0.8,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.45,
                gunGap: 0.8,
            },
        },

    },

    {
        key: "arcgun",
        name: "Electric SpaceProbe",
        gun: { typeId: "09_arcgun" }, // mount.offsetX = 0.4 (narrowest)

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: -0.55,
                engineGap: 0.12,
                nozzleOffset: 0,
            },

            projectile: {
                offsetX: 0,
                offsetY: 0.55,
                gunGap: 0.4,
            },

            beam: {
                offsetX: 0,
                offsetY: 0.55,
                gunGap: 0.4,
            },

            missile: {
                offsetX: 0,
                offsetY: 0.55,
                gunGap: 0.4,
            },

            thrower: {
                offsetX: 0,
                offsetY: 0.55,
                gunGap: 0.4,
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
                offsetY: -0.65,
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

]

export const BOSS_INDEX_BY_KEY = Object.fromEntries(
    BOSSES.map((boss, index) => [boss.key, index])
)
