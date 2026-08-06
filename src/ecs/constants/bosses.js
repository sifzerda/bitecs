// src/ecs/constants/bosses.js

// ============================================================
// Boss roster
// ============================================================

export const BOSSES = [
    {
        key: "shotgun",
        name: "Space Cowboy",
        gun: {
            typeId: "01_shotgun",
        },
    },

    {
        key: "machinegun",
        name: "Rambo The Space Copter",
        gun: {
            typeId: "02_machinegun",
        },
    },

    {
        key: "cryogun",
        name: "The Flying Refrigerator",
        gun: {
            typeId: "03_cryogun",
        },
    },

    {
        key: "grenadegun",
        name: "War Machine",
        gun: {
            typeId: "04_grenadelauncher",
        },
    },

    {
        key: "acidthrowergun",
        name: "Space Tractor",
        gun: {
            typeId: "05_acidthrower",
        },
    },

    {
        key: "missilegun",
        name: "Rogue Mars Missiler",
        gun: {
            typeId: "06_missilelauncher",
        },
    },

    {
        key: "flamethrowergun",
        name: "X-10 Space Dragon",
        gun: {
            typeId: "07_flamethrower",
        },
    },

    {
        key: "lasergun",
        name: "UFO",
        gun: {
            typeId: "08_lasergun",
        },
    },

    {
        key: "arcgun",
        name: "Electric SpaceProbe",
        gun: {
            typeId: "09_arcgun",
        },
    },

    {
        key: "plasmagun",
        name: "Starscream",
        gun: {
            typeId: "10_plasmagun",
        },
    },

]

export const BOSS_INDEX_BY_KEY = Object.fromEntries(
    BOSSES.map((boss, index) => [boss.key, index])
)