// src/debug/GunPanel.jsx

import { useMemo, useEffect } from 'react'
import { useControls, button } from 'leva'
import { GUN_TYPES, DEFAULT_GUN_CONFIG } from '../ecs/constants/gunConfigs.js'
import { GunRenderer } from '../renderers/GunRenderer.jsx'

import { debugState, setPreviewGunConfigOverride } from "./debugState.js"
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
    // Boss Preview must be declared first — Gun Test's auto-sync effect
    // and the showGun visibility guard both depend on showBoss/bossIndex.
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

    // Function form so we can call `set` to auto-sync selectedId to
    // whichever boss is selected in Boss Preview.
    const [{ gunVisible, selectedId, gunPreviewScale, mirrored }, setGunTest] = useControls(
        'Gun Test',
        () => ({
            gunVisible: { value: false, label: 'Show Gun Preview' },
            selectedId: { options: gunOptions, value: GUN_TYPES[0].id, label: 'Gun Type' },
            gunPreviewScale: { value: 3, min: 0.5, max: 8, step: 0.1 },
            mirrored: { value: true, label: 'Show Twin Pair' },
        }),
        []
    )

    // Keep Gun Test's dropdown in sync with whichever boss is currently
    // selected in Boss Preview, so tuning always starts from that boss's
    // actual gun rather than whatever was last picked manually.
    useEffect(() => {
        if (showBoss) {
            const bossGunTypeId = BOSSES[bossIndex]?.gun?.typeId
            if (bossGunTypeId) {
                setGunTest({ selectedId: bossGunTypeId })
            }
        }
    }, [showBoss, bossIndex, setGunTest])

    const baseCfg = useMemo(() => GUN_TYPES.find(g => g.id === selectedId)?.config ?? DEFAULT_GUN_CONFIG,
        [selectedId]
    )

    const controls = useControls('Gun Tuning', {
        frameColor: { value: baseCfg.frame.color },
        frameLength: { value: baseCfg.frame.length, min: 0.3, max: 1.3, step: 0.01 },
        frameHeight: { value: baseCfg.frame.height, min: 0.05, max: 0.35, step: 0.005 },

        barrelColor: { value: baseCfg.barrel.color },
        barrelLength: { value: baseCfg.barrel.length, min: 0.05, max: 0.6, step: 0.01 },
        barrelWidth: { value: baseCfg.barrel.width, min: 0.01, max: 0.15, step: 0.005, label: 'Barrel Width' },
        barrelOffsetX: { value: baseCfg.barrel.offsetX, min: -1, max: 1.5, step: 0.01, label: 'Barrel Offset X' },
        barrelOffsetY: { value: baseCfg.barrel.offsetY, min: -0.5, max: 0.5, step: 0.01, label: 'Barrel Offset Y' },

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
            console.log(`${selectedId} overrides:`, JSON.stringify({
                frame: {
                    color: get('Gun Tuning.frameColor'),
                    length: get('Gun Tuning.frameLength'),
                    height: get('Gun Tuning.frameHeight'),
                },
                barrel: {
                    color: get('Gun Tuning.barrelColor'),
                    length: get('Gun Tuning.barrelLength'),
                    width: get('Gun Tuning.barrelWidth'),
                    offsetX: get('Gun Tuning.barrelOffsetX'),
                    offsetY: get('Gun Tuning.barrelOffsetY'),
                },
                muzzle: {
                    offsetX: get('Gun Tuning.muzzleOffsetX'),
                    offsetY: get('Gun Tuning.muzzleOffsetY'),
                },
                mountBracket: {
                    color: get('Gun Tuning.mountBracketColor'),
                    length: get('Gun Tuning.mountBracketLength'),
                    width: get('Gun Tuning.mountBracketWidth'),
                },
                mount: {
                    offsetX: get('Gun Tuning.gunGap'),
                    offsetY: get('Gun Tuning.mountOffsetY'),
                },
                coreGlow: {
                    color: get('Gun Tuning.coreGlowColor'),
                    intensity: get('Gun Tuning.coreGlowIntensity'),
                    offsetX: get('Gun Tuning.coreGlowOffsetX'),
                    offsetY: get('Gun Tuning.coreGlowOffsetY'),
                },
                accentStripe: { color: get('Gun Tuning.accentColor') },
            }, null, 2))
        }),
    }, [baseCfg])

    const liveCfg = useMemo(() => ({
        ...baseCfg,
        frame: { ...baseCfg.frame, color: controls.frameColor, length: controls.frameLength, height: controls.frameHeight },
        barrel: {
            ...baseCfg.barrel,
            color: controls.barrelColor,
            length: controls.barrelLength,
            width: controls.barrelWidth,
            offsetX: controls.barrelOffsetX,
            offsetY: controls.barrelOffsetY,
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

    // Push live tuning values to the boss preview slot whenever it's
    // active, so Gun Tuning sliders visibly affect the previewed boss's
    // gun in real time. Cleared when the preview isn't showing so real
    // gameplay bosses are never affected.
    useEffect(() => {
        setPreviewGunConfigOverride(showBoss ? liveCfg : null)
    }, [showBoss, liveCfg])

    // Belt-and-suspenders: clear the override if GunPanel itself unmounts
    // while a preview override was active.
    useEffect(() => {
        return () => setPreviewGunConfigOverride(null)
    }, [])

    // Gun Test's standalone preview and Boss Preview both render near the
    // same spot — never show both at once, or the unrelated Gun Test gun
    // will look like it's attached to (and wrong for) the previewed boss.
    const showGun = gunVisible && !showBoss
    const rotation = [0, 0, GUN_DIRECTION]
    const zOffset = 0.04

    return (
        <>
            {showGun && (
                mirrored ? (
                    <group position={[0, 0, 5]}>
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
                        position={[0, 0, 5]}
                        rotation={rotation}
                        scale={gunPreviewScale}
                    />
                )
            )}
        </>
    )
}