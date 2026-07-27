// src/ecs/weapons/config/weaponSchema.js

const REQUIRED_BY_CATEGORY = {
    bullet:  ['damage', 'fireRate', 'speed', 'lifetime', 'projectileCount', 'spreadAngle'],
    beam:    ['range', 'damagePerSecond'],
    thrower: ['range', 'coneAngle', 'damagePerSecond'],
}

export function validateWeapons(WEAPONS) {
    const errors = []

    WEAPONS.forEach((w, i) => {
        if (w.id !== i) errors.push(`WEAPONS[${i}]: id ${w.id} !== array index ${i}`)

        const required = REQUIRED_BY_CATEGORY[w.category]
        if (!required) {
            errors.push(`${w.name}: unknown category "${w.category}"`)
        } else {
            for (const field of required) {
                if (w[field] === undefined) errors.push(`${w.name} (${w.category}): missing "${field}"`)
            }
        }
    })

    if (errors.length) throw new Error('Weapon config errors:\n' + errors.join('\n'))
}