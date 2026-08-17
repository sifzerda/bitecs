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
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.06,
            width: 0.06,
            height: 0.1,
            lensColor: '#CCCCFF',
        },
        propellers: [],

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
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.15,
            width: 0.09,
            height: 0.13,
            lensColor: '#4169E1',
        },
        propellers: [
            { mountKey: 'left', offsetX: 0.08, offsetY: -0.653, radius: 0.05, bladeCount: 3, bladeColor: '#2A3439', hubColor: '#000000', spinSpeed: 6, direction: 1, hubScale: 0.7 },
            { mountKey: 'right', offsetX: -0.08, offsetY: -0.653, radius: 0.05, bladeCount: 3, bladeColor: '#2A3439', hubColor: '#000000', spinSpeed: 6, direction: -1, hubScale: 0.7 },
            { mountKey: 'main', offsetX: 0, offsetY: -0.09, radius: 0.2, bladeCount: 4, bladeColor: '#2A3439', hubColor: '#000000', spinSpeed: 4, direction: 1, hubScale: 0.5 },
        ],

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
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.14,
            width: 0.11,
            height: 0.1,
            lensColor: '#8ecbff',
        },
        propellers: [],

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
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.55,
            width: 0.06,
            height: 0.13,
            lensColor: '#5aa9ff',
        },
        propellers: [],

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
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.1,
            width: 0.05,
            height: 0.06,
            lensColor: '#5aa9ff',
        },
        propellers: [
            {
                mountKey: 'nose',
                offsetX: 0,
                offsetY: 0.3,
                radius: 0.07,
                bladeColor: '#FFFFFF',
                spinSpeed: 22,
                sideways: false,
            },
        ],

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
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.1,
            width: 0.06,
            height: 0.09,
            lensColor: '#ff8a5a',
        },
        propellers: [],

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
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.04,
            width: 0.07,
            height: 0.13,
            lensColor: '#ff3355',
        },
        propellers: [],

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
        cockpitGlass: {
            offsetX: 0,
            offsetY: -0.05,
            width: 0.13,
            height: 0.14,
            lensColor: '#44ff88',
        },
        propellers: [],

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
        cockpitGlass: {
            offsetX: 0,
            offsetY: -0.03,
            width: 0.06,
            height: 0.1,
            lensColor: '#005eff',
        },
        propellers: [],

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
        cockpitGlass: {
            offsetX: 0,
            offsetY: 0.05,
            width: 0.08,
            height: 0.10,
            lensColor: '#e9ff5a',
        },
        propellers: [],

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



 
{
        key: "octopus",
        name: "The Kraken",

        // Not a ship — no hull/cockpit/propellers to render.
        // OctopusRenderer.jsx already draws its body (the tentacle plume)
        // directly from this entity's Position/Rotation, same as GunMount
        // tracks any other boss. isShip lets a ship-hull renderer skip this
        // entry once wired up — see chat, I don't have that file yet.
        isShip: false,

        // Reused ONLY to derive a weaponId (thrower/"ink spray" category)
        // via the same getGunTypeById() lookup spawn.js already does for
        // every boss — NOT rendered as a held weapon model. gunVisible
        // tells GunMount.jsx to skip mounting a visible gun mesh here.
        gun: { typeId: "05_acidthrower" },
        gunVisible: false,

        // Final-boss stat weight.
        health: 900,

        // Tentacle plume reads much larger on-screen than a ship hull —
        // widen the hit circle combat.js uses for this boss specifically.
        hitRadius: 3.5,

        emission: {
            exhaust: {
                offsetX: 0,
                offsetY: 0,
                engineGap: 0,
                nozzleOffset: 0,
            },
            // No exhaust — it doesn't thrust like a ship. octoAISystem.js
            // drives its movement directly via Velocity, so nothing calls
            // getBossEmissionConfig(id, "exhaust") for it in practice.
            thrower: {
                offsetX: 0,
                offsetY: 0,
                gunGap: 0,
            },
        },
    },
]

export const BOSS_INDEX_BY_KEY = Object.fromEntries(
    BOSSES.map((boss, index) => [boss.key, index])
)

// Central place to identify the octopus by its resolved type index,
// instead of string-comparing boss.key in every system that needs to
// know "is this boss the octopus." Used by tentacleSystem.js,
// octoAISystem.js, and combat.js.
export function isOctopusType(typeIndex) {
    return typeIndex === BOSS_INDEX_BY_KEY["octopus"]
}