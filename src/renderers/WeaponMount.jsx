// src/renderers/WeaponMount.jsx

import { GunRenderer } from './GunRenderer.jsx'
import { getGunTypeById } from '../ecs/constants/gunConfigs.js'

const GUN_DIRECTION = Math.PI / 2

// Renders whatever gun a ship is configured to carry, at that ship's
// local hardpoint offset. Called by both GunMount (player) and
// BossGunMount (bosses) — gun *appearance* lives entirely in gunCfg,
// so any ship can carry any gun from GUN_TYPES.
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