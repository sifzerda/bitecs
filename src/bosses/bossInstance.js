

export function createBossInstance(definition, entity, wave) {
    return {
        id: definition.id,
        entity,
        wave,
        alive: true,
        hp: definition.getHealth(wave)
    }
}