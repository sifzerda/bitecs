// src/renderers/WeaponMount.jsx

import { SVGGun } from './SVGGun.jsx'
import { getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'

const GUN_DIRECTION = Math.PI / 2

export function WeaponMount({ gunCfg, configOverride = null }) {
    if (!gunCfg?.enabled) return null

    const gunType = getGunTypeById(gunCfg.typeId)
    const resolvedConfig = configOverride ?? gunType.config
    const zOffset = gunCfg.zOffset ?? 0.04
    const rotation = [0, 0, GUN_DIRECTION + (gunCfg.rotation ?? 0)]
    const scale = gunCfg.scale ?? resolvedConfig.mount.scale
    const mount = resolvedConfig.mount

    if (gunCfg.mirrored === false) {
        return (
            <SVGGun
                svg={gunType.svg}
                width={mount.width}
                height={mount.height}
                position={[gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
        )
    }

    return (
        <>
            <SVGGun
                svg={gunType.svg}
                width={mount.width}
                height={mount.height}
                position={[-gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
            <SVGGun
                svg={gunType.svg}
                width={mount.width}
                height={mount.height}
                position={[gunCfg.offsetX, gunCfg.offsetY, zOffset]}
                rotation={rotation}
                scale={scale}
            />
        </>
    )
}