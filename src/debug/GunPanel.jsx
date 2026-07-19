// src/debug/GunPanel.jsx

import { useMemo, useEffect } from 'react'
import { useSyncExternalStore } from 'react'
import { useControls, button } from 'leva'
import { GUN_TYPES, DEFAULT_GUN_CONFIG } from '../ecs/constants/gunConfigs.js'
import { GunRenderer } from '../renderers/GunRenderer.jsx'

import { setPreviewGunConfigOverride, subscribePreviewBossSelection, getPreviewBossSelection } from "./debugState.js"
import { BOSSES } from "../ecs/constants/bosses.js"

const gunOptions = GUN_TYPES.reduce((acc, g) => {
    acc[g.name] = g.id
    return acc
}, {})

const GUN_DIRECTION = Math.PI / 2
function BossGunTuningPanel({ bossIndex }) {
    const gunTypeId = BOSSES[bossIndex]?.gun?.typeId
    const baseCfg = useMemo(() => GUN_TYPES.find(g => g.id === gunTypeId)?.config ?? DEFAULT_GUN_CONFIG,
        [gunTypeId]
    )

    const controls = useControls('Boss Gun Tuning', {
        frameColor: { value: baseCfg.frame.color },
        frameLength: { value: baseCfg.frame.length, min: 0.3, max: 1.3, step: 0.01 },
        frameHeight: { value: baseCfg.frame.height, min: 0.05, max: 0.35, step: 0.005 },
        frameOffsetX: { value: baseCfg.frame.offsetX ?? 0, min: -1, max: 1.5, step: 0.01, label: 'Frame Offset X' },
        frameOffsetY: { value: baseCfg.frame.offsetY ?? 0, min: -0.5, max: 0.5, step: 0.01, label: 'Frame Offset Y' },

        barrelColor: { value: baseCfg.barrel.color },
        barrelLength: { value: baseCfg.barrel.length, min: 0.05, max: 0.6, step: 0.01 },
        barrelWidth: { value: baseCfg.barrel.width, min: 0.01, max: 0.15, step: 0.005, label: 'Barrel Width' },
        barrelOffsetX: { value: baseCfg.barrel.offsetX, min: -1, max: 1.5, step: 0.01, label: 'Barrel Offset X' },
        barrelOffsetY: { value: baseCfg.barrel.offsetY, min: -0.5, max: 0.5, step: 0.01, label: 'Barrel Offset Y' },

        canisterEnabled: { value: baseCfg.canister?.enabled ?? false, label: 'Canister Enabled' },
        canisterColor: { value: baseCfg.canister?.color ?? '#eafcff', label: 'Canister Color' },
        canisterLength: { value: baseCfg.canister?.length ?? 0.3, min: 0.05, max: 1, step: 0.01, label: 'Canister Length' },
        canisterWidth: { value: baseCfg.canister?.width ?? 0.2, min: 0.05, max: 0.6, step: 0.005, label: 'Canister Width' },
        canisterOffsetX: { value: baseCfg.canister?.offsetX ?? 0.6, min: -1, max: 1.5, step: 0.01, label: 'Canister Offset X' },
        canisterOffsetY: { value: baseCfg.canister?.offsetY ?? 0, min: -0.5, max: 0.5, step: 0.01, label: 'Canister Offset Y' },
        canisterTransmission: { value: baseCfg.canister?.transmission ?? 0.9, min: 0, max: 1, step: 0.01, label: 'Canister Glass' },

        muzzleOffsetX: { value: baseCfg.muzzle.offsetX ?? 0, min: -0.5, max: 0.5, step: 0.01, label: 'Muzzle Offset X' },
        muzzleOffsetY: { value: baseCfg.muzzle.offsetY ?? 0, min: -0.5, max: 0.5, step: 0.01, label: 'Muzzle Offset Y' },

        mountBracketColor: { value: baseCfg.mountBracket.color, label: 'Mount Color' },
        mountBracketLength: { value: baseCfg.mountBracket.length, min: 0.05, max: 0.4, step: 0.005, label: 'Mount Length' },
        mountBracketWidth: { value: baseCfg.mountBracket.width, min: 0.1, max: 0.6, step: 0.005, label: 'Mount Width' },

        gunGap: { value: baseCfg.mount.offsetX, min: 0.1, max: 1.2, step: 0.01, label: 'Gun Gap (half)' },
        mountOffsetY: { value: baseCfg.mount.offsetY, min: -0.5, max: 0.5, step: 0.01, label: 'Mount Offset Y' },

        coreGlowColor: { value: baseCfg.coreGlow.color },
        coreGlowIntensity: { value: baseCfg.coreGlow.intensity, min: 0, max: 3, step: 0.05 },
        coreGlowOffsetX: { value: baseCfg.coreGlow.offsetX, min: -1.5, max: 1.5, step: 0.01, label: 'Glow Offset X' },
        coreGlowOffsetY: { value: baseCfg.coreGlow.offsetY ?? 0, min: -0.5, max: 0.5, step: 0.01, label: 'Glow Offset Y' },

        accentColor: { value: baseCfg.accentStripe.color },
        'Log Config': button((get) => {
            console.log(`${gunTypeId} overrides:`, JSON.stringify({
                frame: {
                    color: get('Boss Gun Tuning.frameColor'),
                    length: get('Boss Gun Tuning.frameLength'),
                    height: get('Boss Gun Tuning.frameHeight'),
                    offsetX: get('Boss Gun Tuning.frameOffsetX'),
                    offsetY: get('Boss Gun Tuning.frameOffsetY'),
                },
                barrel: {
                    color: get('Boss Gun Tuning.barrelColor'),
                    length: get('Boss Gun Tuning.barrelLength'),
                    width: get('Boss Gun Tuning.barrelWidth'),
                    offsetX: get('Boss Gun Tuning.barrelOffsetX'),
                    offsetY: get('Boss Gun Tuning.barrelOffsetY'),
                },
                canister: {
                    enabled: get('Boss Gun Tuning.canisterEnabled'),
                    color: get('Boss Gun Tuning.canisterColor'),
                    length: get('Boss Gun Tuning.canisterLength'),
                    width: get('Boss Gun Tuning.canisterWidth'),
                    offsetX: get('Boss Gun Tuning.canisterOffsetX'),
                    offsetY: get('Boss Gun Tuning.canisterOffsetY'),
                    transmission: get('Boss Gun Tuning.canisterTransmission'),
                },
                muzzle: {
                    offsetX: get('Boss Gun Tuning.muzzleOffsetX'),
                    offsetY: get('Boss Gun Tuning.muzzleOffsetY'),
                },
                mountBracket: {
                    color: get('Boss Gun Tuning.mountBracketColor'),
                    length: get('Boss Gun Tuning.mountBracketLength'),
                    width: get('Boss Gun Tuning.mountBracketWidth'),
                },
                mount: {
                    offsetX: get('Boss Gun Tuning.gunGap'),
                    offsetY: get('Boss Gun Tuning.mountOffsetY'),
                },
                coreGlow: {
                    color: get('Boss Gun Tuning.coreGlowColor'),
                    intensity: get('Boss Gun Tuning.coreGlowIntensity'),
                    offsetX: get('Boss Gun Tuning.coreGlowOffsetX'),
                    offsetY: get('Boss Gun Tuning.coreGlowOffsetY'),
                },
                accentStripe: { color: get('Boss Gun Tuning.accentColor') },
            }, null, 2))
        }),
    })

    const liveCfg = useMemo(() => ({
        ...baseCfg,
        frame: {
            ...baseCfg.frame,
            color: controls.frameColor,
            length: controls.frameLength,
            height: controls.frameHeight,
            offsetX: controls.frameOffsetX,
            offsetY: controls.frameOffsetY,
        },
        barrel: {
            ...baseCfg.barrel,
            color: controls.barrelColor,
            length: controls.barrelLength,
            width: controls.barrelWidth,
            offsetX: controls.barrelOffsetX,
            offsetY: controls.barrelOffsetY,
        },
        canister: {
            ...baseCfg.canister,
            enabled: controls.canisterEnabled,
            color: controls.canisterColor,
            length: controls.canisterLength,
            width: controls.canisterWidth,
            offsetX: controls.canisterOffsetX,
            offsetY: controls.canisterOffsetY,
            transmission: controls.canisterTransmission,
        },
        muzzle: {
            ...baseCfg.muzzle,
            offsetX: controls.muzzleOffsetX,
            offsetY: controls.muzzleOffsetY,
        },
        mountBracket: {
            ...baseCfg.mountBracket,
            color: controls.mountBracketColor,
            length: controls.mountBracketLength,
            width: controls.mountBracketWidth,
        },
        coreGlow: {
            ...baseCfg.coreGlow,
            color: controls.coreGlowColor,
            intensity: controls.coreGlowIntensity,
            offsetX: controls.coreGlowOffsetX,
            offsetY: controls.coreGlowOffsetY,
        },
        accentStripe: { ...baseCfg.accentStripe, color: controls.accentColor },
    }), [baseCfg, controls])

    useEffect(() => {
        setPreviewGunConfigOverride(liveCfg)
    }, [liveCfg])

    useEffect(() => {
        return () => setPreviewGunConfigOverride(null)
    }, [])

    return null
}

export function GunPanel() {
    const { enabled: showBoss, index: bossIndex } = useSyncExternalStore(
        subscribePreviewBossSelection,
        getPreviewBossSelection,
        getPreviewBossSelection
    )

    const { gunVisible, selectedId, gunPreviewScale, mirrored } = useControls('Gun Test', {
        gunVisible: { value: false, label: 'Show Gun Preview' },
        selectedId: { options: gunOptions, value: GUN_TYPES[0].id, label: 'Gun Type' },
        gunPreviewScale: { value: 3, min: 0.5, max: 8, step: 0.1 },
        mirrored: { value: true, label: 'Show Twin Pair' },
    })

    const baseCfg = useMemo(() => GUN_TYPES.find(g => g.id === selectedId)?.config ?? DEFAULT_GUN_CONFIG,
        [selectedId]
    )

    const showGun = gunVisible && !showBoss
    const rotation = [0, 0, GUN_DIRECTION]
    const zOffset = 0.04

    return (
        <>
            {showBoss && <BossGunTuningPanel key={bossIndex} bossIndex={bossIndex} />}

            {showGun && (
                mirrored ? (
                    <group position={[0, 0, 5]}>
                        <GunRenderer
                            config={baseCfg}
                            position={[-baseCfg.mount.offsetX, baseCfg.mount.offsetY, zOffset]}
                            rotation={rotation}
                            scale={gunPreviewScale}
                        />
                        <GunRenderer
                            config={baseCfg}
                            position={[baseCfg.mount.offsetX, baseCfg.mount.offsetY, zOffset]}
                            rotation={rotation}
                            scale={gunPreviewScale}
                        />
                    </group>
                ) : (
                    <GunRenderer
                        config={baseCfg}
                        position={[0, 0, 5]}
                        rotation={rotation}
                        scale={gunPreviewScale}
                    />
                )
            )}
        </>
    )
}