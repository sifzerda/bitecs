// src/renderers/WeaponMount.jsx

import { GunRenderer } from './GunRenderer.jsx'
import { getGunTypeById } from '../ecs/constants/gunConfigs.js'

const GUN_DIRECTION = Math.PI / 2

export function WeaponMount({ gunCfg }) {
    if (!gunCfg?.enabled) return null

    const gunType = getGunTypeById(gunCfg.typeId)
    const zOffset = gunCfg.zOffset ?? 0.04
    const rotation = [0, 0, GUN_DIRECTION + (gunCfg.rotation ?? 0)]
    const scale = gunCfg.scale ?? gunType.config.mount.scale

    if (gunCfg.mirrored === false) {
        return (
            <GunRenderer
                config={gunType.config}
                position={[gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
        )
    }

    return (
        <>
            <GunRenderer
                config={gunType.config}
                position={[-gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
            <GunRenderer
                config={gunType.config}
                position={[gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
        </>
    )
}