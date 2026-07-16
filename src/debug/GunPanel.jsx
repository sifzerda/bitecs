// src/debug/GunPanel.jsx

import { useMemo } from 'react'
import { useControls, button } from 'leva'
import { GUN_TYPES, DEFAULT_GUN_CONFIG } from '../ecs/constants/gunConfigs.js'
import { GunRenderer } from '../renderers/GunRenderer.jsx'

import { debugState } from "./debugState.js"
import { BOSSES } from "../ecs/constants/bosses.js"

const gunOptions = GUN_TYPES.reduce((acc, g) => {
    acc[g.name] = g.id
    return acc
}, {})

const bossOptions = BOSSES.reduce((acc, b, i) => {
    acc[b.name] = i
    return acc
}, {})

const GUN_DIRECTION = Math.PI / 2

export function GunPanel() {

    const {
    gunVisible,
    selectedId,
    gunPreviewScale,
    mirrored
} = useControls('Gun Test', {
        gunVisible: { value: false, label: 'Show Gun Preview' },
        selectedId: { options: gunOptions, value: GUN_TYPES[0].id, label: 'Gun Type' },
        gunPreviewScale: { value: 3, min: 0.5, max: 8, step: 0.1 },
        mirrored: { value: true, label: 'Show Twin Pair' },
    })

    const baseCfg = useMemo(() => GUN_TYPES.find(g => g.id === selectedId)?.config ?? DEFAULT_GUN_CONFIG,
        [selectedId]
    )

    const controls = useControls('Gun Tuning', {
        frameColor: { value: baseCfg.frame.color },
        frameLength: { value: baseCfg.frame.length, min: 0.3, max: 1.3, step: 0.01 },
        frameHeight: { value: baseCfg.frame.height, min: 0.05, max: 0.35, step: 0.005 },
        barrelColor: { value: baseCfg.barrel.color },
        barrelLength: { value: baseCfg.barrel.length, min: 0.05, max: 0.6, step: 0.01 },
        mountBracketColor: { value: baseCfg.mountBracket.color, label: 'Mount Color' },
        mountBracketLength: { value: baseCfg.mountBracket.length, min: 0.05, max: 0.4, step: 0.005, label: 'Mount Length' },
        mountBracketWidth: { value: baseCfg.mountBracket.width, min: 0.1, max: 0.6, step: 0.005, label: 'Mount Width' },
        gunGap: { value: baseCfg.mount.offsetX, min: 0.1, max: 1.2, step: 0.01, label: 'Gun Gap (half)' },
        mountOffsetY: { value: baseCfg.mount.offsetY, min: -0.5, max: 0.5, step: 0.01, label: 'Mount Offset Y' },
        coreGlowColor: { value: baseCfg.coreGlow.color },
        coreGlowIntensity: { value: baseCfg.coreGlow.intensity, min: 0, max: 3, step: 0.05 },
        accentColor: { value: baseCfg.accentStripe.color },
        'Log Config': button(() => {
            console.log(`${selectedId} overrides:`, JSON.stringify({
                frame: { color: controls.frameColor, length: controls.frameLength, height: controls.frameHeight },
                barrel: { color: controls.barrelColor, length: controls.barrelLength },
                mountBracket: {
                    color: controls.mountBracketColor,
                    length: controls.mountBracketLength,
                    width: controls.mountBracketWidth,
                },
                mount: { offsetX: controls.gunGap, offsetY: controls.mountOffsetY },
                coreGlow: { color: controls.coreGlowColor, intensity: controls.coreGlowIntensity },
                accentStripe: { color: controls.accentColor },
            }, null, 2))
        }),
    }, [baseCfg])

    const liveCfg = useMemo(() => ({
        ...baseCfg,
        frame: { ...baseCfg.frame, color: controls.frameColor, length: controls.frameLength, height: controls.frameHeight },
        barrel: { ...baseCfg.barrel, color: controls.barrelColor, length: controls.barrelLength },
        mountBracket: {
            ...baseCfg.mountBracket,
            color: controls.mountBracketColor,
            length: controls.mountBracketLength,
            width: controls.mountBracketWidth,
        },
        coreGlow: { ...baseCfg.coreGlow, color: controls.coreGlowColor, intensity: controls.coreGlowIntensity },
        accentStripe: { ...baseCfg.accentStripe, color: controls.accentColor },
    }), [baseCfg, controls])

    const {
      showBoss,
    bossIndex,
    previewX,
    previewY,
    previewZ,
    previewRotation,
    previewScale,
} = useControls("Boss Preview", {
    showBoss: false,

    bossIndex: {
        value: 0,
        options: bossOptions,
    },

    previewX: {
        value: 0,
        min: -20,
        max: 20,
        step: 0.1,
    },

    previewY: {
        value: 0,
        min: -20,
        max: 20,
        step: 0.1,
    },

    previewZ: {
        value: 5,
        min: -10,
        max: 20,
        step: 0.1,
    },

    previewRotation: {
        value: 0,
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
    },

    previewScale: {
        value: 3,
        min: 0.2,
        max: 10,
        step: 0.1,
    },
})

debugState.previewBossEnabled = showBoss
debugState.previewBossIndex = bossIndex

debugState.previewBossPosition.set(
    previewX,
    previewY,
    previewZ
)

debugState.previewBossRotation = previewRotation
debugState.previewBossScale = previewScale

   // if (!gunVisible) return null
const showGun = gunVisible
    // Renders straight from GunRenderer (like before) rather than going
    // through WeaponMount/getGunTypeById, since liveCfg's tuned values
    // aren't registered in GUN_TYPES and wouldn't be found by that
    // lookup — but replicates WeaponMount's rotation/gap/mirroring logic
    // directly so the preview matches what you'll see in-game.
    const rotation = [0, 0, GUN_DIRECTION]
    const zOffset = 0.04

   // if (!mirrored) { return <GunRenderer config={liveCfg} position={[0, 0, 5]} rotation={rotation} scale={gunPreviewScale} /> }

return (
    <>
        {showGun && (
            mirrored ? (
                <group position={[0,0,5]}>
                    <GunRenderer
                        config={liveCfg}
                        position={[
                            -controls.gunGap,
                            controls.mountOffsetY,
                            zOffset
                        ]}
                        rotation={rotation}
                        scale={gunPreviewScale}
                    />

                    <GunRenderer
                        config={liveCfg}
                        position={[
                            controls.gunGap,
                            controls.mountOffsetY,
                            zOffset
                        ]}
                        rotation={rotation}
                        scale={gunPreviewScale}
                    />
                </group>
            ) : (
                <GunRenderer
                    config={liveCfg}
                    position={[0,0,5]}
                    rotation={rotation}
                    scale={gunPreviewScale}
                />
            )
        )}
    </>
)
}