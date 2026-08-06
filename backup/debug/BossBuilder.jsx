// src/debug/BossBuilder.jsx

import { useMemo, useRef } from 'react'
import { useControls, folder, button } from 'leva'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { BOSSES } from '../ecs/constants/bosses.js'
import { BossShip, buildBossAssets, HULL_TEXTURES } from '../renderers/BossRenderer.jsx'
import { setPreviewBossSelection } from './debugState.js'

const bossOptions = BOSSES.reduce((acc, b, i) => {
    acc[b.name] = i
    return acc
}, {})

// Gun appearance is intentionally excluded here — GunPanel's "Boss Gun
// Tuning" panel already handles it and stays synced to whichever boss is
// selected below. healthBar is global, not per-boss, so it's excluded too.
const EXCLUDED_GROUPS = new Set(['gun', 'healthBar'])

function isEditableGroup(cfg, key) {
    return !EXCLUDED_GROUPS.has(key) && cfg[key] && typeof cfg[key] === 'object'
}

// Rough heuristic so numeric sliders get a usable range/step without
// hand-tuning every one of ~150 fields. Integers (counts) get a 0..4x
// range with step 1; everything else gets a symmetric range scaled to
// its own magnitude. Adjust any individual field's min/max/step by hand
// later if a particular slider feels too coarse or too fine.
function inferNumberControl(value) {
    if (Number.isInteger(value)) {
        return { value, min: 0, max: Math.max(value * 4, 20), step: 1 }
    }
    const abs = Math.abs(value) || 1
    const range = Math.max(abs * 4, 2)
    return { value, min: -range, max: range, step: 0.005 }
}

function buildFieldControl(groupName, fieldKey, value) {
    if (groupName === 'hullTexture' && fieldKey === 'textureKey') {
        return { value, options: Object.keys(HULL_TEXTURES), label: fieldKey }
    }
    if (typeof value === 'boolean') return { value, label: fieldKey }
    if (typeof value === 'string') return { value, label: fieldKey } // hex colors auto-render as color pickers
    if (typeof value === 'number') return { ...inferNumberControl(value), label: fieldKey }
    return null
}

// Field keys are prefixed with their group name (e.g. `fuselage__color`)
// because Leva's useControls flattens all fields into one namespace per
// call — folder() only groups them visually. Without prefixing, fields
// that share a name across groups (color, width, offsetX, offsetY, ...)
// would silently collide and overwrite each other.
function buildGroupSchema(groupName, groupCfg) {
    const fields = {}
    for (const [fieldKey, value] of Object.entries(groupCfg)) {
        const control = buildFieldControl(groupName, fieldKey, value)
        if (!control) continue
        fields[`${groupName}__${fieldKey}`] = control
    }
    return fields
}

// Remounted (via `key={bossIndex}` in the parent) whenever the selected
// boss changes, so Leva always initializes fresh from that boss's actual
// config — same remount-on-selection pattern used by GunPanel's Boss Gun
// Tuning panel, for the same reason (avoids stale values / lag).
function BossConfigEditor({ bossIndex, groupNames }) {
    const baseCfg = BOSSES[bossIndex]

    const schema = useMemo(() => {
        const s = {}
        for (const groupName of groupNames) {
            s[groupName] = folder(buildGroupSchema(groupName, baseCfg[groupName]), { collapsed: true })
        }
        return s
    }, [baseCfg, groupNames])

    const controls = useControls('Boss Builder', {
        ...schema,
        'Log Boss Config': button(() => {
            const out = {}
            for (const groupName of groupNames) {
                out[groupName] = {}
                for (const fieldKey of Object.keys(baseCfg[groupName])) {
                    out[groupName][fieldKey] = controls[`${groupName}__${fieldKey}`]
                }
            }
            // Paste this straight into the matching boss's withDefaults({...})
            // entry in bosses.js.
            console.log(`${baseCfg.key} overrides:`, JSON.stringify(out, null, 2))
        }),
    })

    return controls
}

// Renders a live preview ship whose geometry rebuilds from the tuned
// config on every change — this is a fresh, dedicated ship (not one of
// BossRenderer's shared, precomputed-once slots), because shape-driving
// fields (fuselage points, wing points, etc.) require rebuilding the
// actual Three.js geometry, not just swapping material props.
function BossBuilderPreview({ bossIndex, groupNames, position, rotation, scale }) {
    const baseCfg = BOSSES[bossIndex]
    const controls = BossConfigEditor({ bossIndex, groupNames })

    const liveCfg = useMemo(() => {
        const merged = {
            key: baseCfg.key,
            name: baseCfg.name,
            gun: baseCfg.gun,
            healthBar: baseCfg.healthBar,
        }
        for (const groupName of groupNames) {
            merged[groupName] = {}
            for (const fieldKey of Object.keys(baseCfg[groupName])) {
                merged[groupName][fieldKey] = controls[`${groupName}__${fieldKey}`] ?? baseCfg[groupName][fieldKey]
            }
        }
        return merged
    }, [baseCfg, controls, groupNames])

    const textureKeys = useMemo(() => Object.keys(HULL_TEXTURES), [])
    const loadedTextures = useLoader(THREE.TextureLoader, textureKeys.map((k) => HULL_TEXTURES[k]))
    const textures = useMemo(
        () => Object.fromEntries(textureKeys.map((k, i) => [k, loadedTextures[i]])),
        [textureKeys, loadedTextures]
    )

    // Rebuilds all ExtrudeGeometry + materials for this boss whenever any
    // tuned field changes. Fine for a debug tool; if dragging feels
    // laggy on very complex bosses, this is the place to add debouncing.
    const assets = useMemo(() => buildBossAssets(liveCfg, textures), [liveCfg, textures])

    const groupRef = useRef()

    useFrame(() => {
        const group = groupRef.current
        if (!group) return
        group.visible = true
        group.position.set(position[0], position[1], position[2])
        group.rotation.set(0, 0, rotation)
        group.scale.setScalar(scale)
    })

    return (
        <BossShip
            groupRef={groupRef}
            geo={assets.geo}
            cfg={assets.cfg}
            hullMaterials={assets.hullMaterials}
            isPreviewSlot
        />
    )
}

export function BossBuilder() {
    const {
        showBoss,
        bossIndex,
        previewX,
        previewY,
        previewZ,
        previewRotation,
        previewScale,
    } = useControls('Boss Preview', {
        showBoss: false,
        bossIndex: { value: 0, options: bossOptions },
        previewX: { value: 0, min: -20, max: 20, step: 0.1 },
        previewY: { value: 0, min: -20, max: 20, step: 0.1 },
        previewZ: { value: 5, min: -10, max: 20, step: 0.1 },
        previewRotation: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
        previewScale: { value: 3, min: 0.2, max: 10, step: 0.1 },
    })

    // Publish selection so GunPanel can sync its Boss Gun Tuning panel
    // and suppress its standalone Gun Test preview while this is active.
    setPreviewBossSelection(showBoss, bossIndex)

    const baseCfg = BOSSES[bossIndex]
    const groupNames = useMemo(
        () => Object.keys(baseCfg).filter((k) => isEditableGroup(baseCfg, k)),
        [baseCfg]
    )

    if (!showBoss) return null

    return (
        <BossBuilderPreview
            key={bossIndex}
            bossIndex={bossIndex}
            groupNames={groupNames}
            position={[previewX, previewY, previewZ]}
            rotation={previewRotation}
            scale={previewScale}
        />
    )
}