// src/debug/GunPanel.jsx

import { useMemo } from 'react'
import { useControls, button } from 'leva'
import { GUN_TYPES, DEFAULT_GUN_CONFIG } from '../ecs/constants/gunConfigs.js'
import { GunRenderer } from '../renderers/GunRenderer.jsx'

const gunOptions = GUN_TYPES.reduce((acc, g) => {
    acc[g.name] = g.id
    return acc
}, {})

export function GunPanel() {

    const { gunVisible, selectedId, previewScale } = useControls('Gun Test', {
        gunVisible: { value: false, label: 'Show Gun Preview' },
        selectedId: { options: gunOptions, value: GUN_TYPES[0].id, label: 'Gun Type' },
        previewScale: { value: 3, min: 0.5, max: 8, step: 0.1 },
    })

    const baseCfg = useMemo(
        () => GUN_TYPES.find(g => g.id === selectedId)?.config ?? DEFAULT_GUN_CONFIG,
        [selectedId]
    )

    const controls = useControls('Gun Tuning', {
        frameColor: { value: baseCfg.frame.color },
        frameLength: { value: baseCfg.frame.length, min: 0.3, max: 1.3, step: 0.01 },
        frameHeight: { value: baseCfg.frame.height, min: 0.05, max: 0.35, step: 0.005 },
        barrelColor: { value: baseCfg.barrel.color },
        barrelLength: { value: baseCfg.barrel.length, min: 0.05, max: 0.6, step: 0.01 },
        coreGlowColor: { value: baseCfg.coreGlow.color },
        coreGlowIntensity: { value: baseCfg.coreGlow.intensity, min: 0, max: 3, step: 0.05 },
        accentColor: { value: baseCfg.accentStripe.color },
        'Log Config': button(() => {
            console.log(`${selectedId} overrides:`, JSON.stringify({
                frame: { color: controls.frameColor, length: controls.frameLength, height: controls.frameHeight },
                barrel: { color: controls.barrelColor, length: controls.barrelLength },
                coreGlow: { color: controls.coreGlowColor, intensity: controls.coreGlowIntensity },
                accentStripe: { color: controls.accentColor },
            }, null, 2))
        }),
    }, [baseCfg])

    const liveCfg = useMemo(() => ({
        ...baseCfg,
        frame: { ...baseCfg.frame, color: controls.frameColor, length: controls.frameLength, height: controls.frameHeight },
        barrel: { ...baseCfg.barrel, color: controls.barrelColor, length: controls.barrelLength },
        coreGlow: { ...baseCfg.coreGlow, color: controls.coreGlowColor, intensity: controls.coreGlowIntensity },
        accentStripe: { ...baseCfg.accentStripe, color: controls.accentColor },
    }), [baseCfg, controls])

    return gunVisible
        ? <GunRenderer config={liveCfg} position={[0, 0, 5]} scale={previewScale} />
        : null
}