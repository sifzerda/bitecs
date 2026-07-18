// src/renderers/WeaponMount.jsx

import { GunRenderer } from './GunRenderer.jsx'
import { getGunTypeById } from '../ecs/constants/gunConfigs.js'

const GUN_DIRECTION = Math.PI / 2

export function WeaponMount({ gunCfg, configOverride = null }) {
    if (!gunCfg?.enabled) return null

    const gunType = getGunTypeById(gunCfg.typeId)
    // configOverride lets the debug Boss Preview slot render live-tuned
    // values from GunPanel instead of the gun type's static config.
    // Real gameplay never passes configOverride, so this is a no-op there.
    const resolvedConfig = configOverride ?? gunType.config

    const zOffset = gunCfg.zOffset ?? 0.04
    const rotation = [0, 0, GUN_DIRECTION + (gunCfg.rotation ?? 0)]
    const scale = gunCfg.scale ?? resolvedConfig.mount.scale

    if (gunCfg.mirrored === false) {
        return (
            <GunRenderer
                config={resolvedConfig}
                position={[gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
        )
    }

    return (
        <>
            <GunRenderer
                config={resolvedConfig}
                position={[-gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
            <GunRenderer
                config={resolvedConfig}
                position={[gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
        </>
    )
}