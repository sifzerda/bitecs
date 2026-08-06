// src/screens/BossGallery.jsx

import { useRef, useCallback, useState, useMemo } from 'react'
import { useControls, folder, button } from 'leva'
import { BOSSES } from '../ecs/constants/bosses.js'
import BossIcon from '../components/BossIcon.jsx'
import FlightLayout2 from '../components/FlightLayout2.jsx'


function downloadSvg(svgEl, filename) {
    if (!svgEl) return

    const clone = svgEl.cloneNode(true)

    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', '1024')
    clone.setAttribute('height', '1024')
    clone.setAttribute('viewBox', '-3 -3 6 6')

    clone
        .querySelectorAll('[class*="animate-"]')
        .forEach((el) => el.remove())

    const svgString =
        new XMLSerializer()
            .serializeToString(clone)

    const blob = new Blob(
        [svgString],
        { type: 'image/svg+xml;charset=utf-8' }
    )

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = filename

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
}


// ============================================================
// MANUAL PART EDITOR
// ============================================================

// Numeric fields exposed per part group, with [min, max, step?].
// Ranges are generous — several bosses use negative widths/offsets
// deliberately (e.g. cryogun, arcgun), so these aren't clamped tight.
const EDITABLE_RANGES = {
    fuselage: {
        tipY: [-1, 3],
        shoulderY: [-2, 2],
        shoulderWidth: [-1, 1],
        waistY: [-2, 2],
        waistWidth: [-1, 1],
        tailY: [-3, 1],
        tailWidth: [-1, 1],
        notchY: [-2, 1],
    },
    cockpit: {
        topY: [-1, 2],
        topWidth: [-1, 1],
        midY: [-1, 2],
        midWidth: [-1, 1],
        bottomY: [-1, 2],
        bottomWidth: [-1, 1],
    },
    wing: {
        rootX: [-1, 3],
        rootY: [-2, 2],
        tipX: [-1, 3],
        tipY: [-2, 2],
        trailX: [-1, 3],
        trailY: [-2, 2],
        innerX: [-1, 3],
        innerY: [-2, 2],
    },
    wingPanel: {
        inset: [0, 0.5],
    },
    wingtip: {
        offsetX: [-1, 2],
        offsetY: [-2, 2],
        width: [-1, 1],
        height: [-1, 2],
    },
    engineIntake: {
        offsetX: [-1, 2],
        offsetY: [-2, 2],
        width: [-1, 1],
        height: [-2, 2],
    },
    hullVent: {
        offsetX: [-1, 2],
        offsetY: [-2, 2],
        count: [0, 20, 1],
        spacing: [-1, 1],
        width: [-1, 2],
        height: [-1, 1],
    },
    racingStripe: {
        offsetX: [-2, 2],
        offsetY: [-2, 2],
        width: [0, 1],
        length: [0, 3],
        tiltDeg: [-180, 180, 1],
    },
    decal: {
        offsetX: [-2, 2],
        offsetY: [-2, 2],
        width: [0, 1],
        length: [0, 3],
        tiltDeg: [-180, 180, 1],
    },
    noseSpike: {
        offsetY: [-3, 2],
        width: [0, 1],
        length: [0, 1],
        roundness: [-1, 6],
    },
    tailFin: {
        offsetX: [-2, 2],
        offsetY: [-3, 2],
        width: [-1, 2],
        length: [-1, 3],
        sweep: [-1, 1],
    },
    tailBoom: {
        length: [-3, 3],
        baseWidth: [-1, 1],
        tipWidth: [-1, 1],
    },
    boomFin: {
        offsetX: [-2, 2],
        offsetY: [-2, 2],
        width: [-1, 2],
        length: [-1, 2],
        sweep: [-1, 1],
    },
}

// Builds a Leva schema grouped into per-part folders. Keys are prefixed
// (`fuselage_tipY`) so they stay globally unique across folders — Leva's
// folder() is purely a visual grouping, it does NOT namespace the keys
// it returns, so unprefixed names like `offsetX` would collide across
// wing/wingtip/engineIntake/etc.
function buildSchema(boss) {
    const schema = {}

    for (const [group, fields] of Object.entries(EDITABLE_RANGES)) {
        if (!boss[group]) continue

        const groupFields = {}
        for (const [field, range] of Object.entries(fields)) {
            const value = boss[group][field]
            if (typeof value !== 'number') continue

            const [min, max, step] = range
            groupFields[`${group}_${field}`] = {
                value,
                min,
                max,
                step: step ?? 0.01,
                label: field,
            }
        }

        if (Object.keys(groupFields).length > 0) {
            schema[group] = folder(groupFields, { collapsed: true })
        }
    }

    return schema
}

// Flat map of the boss's original values, keyed the same way as the
// schema above — used both for "Reset to Default" and for diffing.
function buildDefaults(boss) {
    const defaults = {}
    for (const [group, fields] of Object.entries(EDITABLE_RANGES)) {
        if (!boss[group]) continue
        for (const field of Object.keys(fields)) {
            const value = boss[group][field]
            if (typeof value === 'number') defaults[`${group}_${field}`] = value
        }
    }
    return defaults
}

// Merges the flat Leva values back into a nested cfg object for BossIcon.
function mergeOverrides(boss, values) {
    const next = structuredClone(boss)
    for (const group of Object.keys(EDITABLE_RANGES)) {
        if (!next[group]) continue
        for (const field of Object.keys(EDITABLE_RANGES[group])) {
            const key = `${group}_${field}`
            if (values[key] !== undefined) next[group][field] = values[key]
        }
    }
    return next
}

function BossEditPanel({ boss, onClose }) {

    // Passing a function (thunk) as the schema gives us back [values, set] —
    // `set` lets us imperatively push values into the Leva controls, which
    // is what powers the "Reset to Default" button below.
    const [values, setValues] = useControls(
        `Edit: ${boss.name}`,
        () => buildSchema(boss),
        [boss.key]
    )

    const defaults = useMemo(() => buildDefaults(boss), [boss])

    const mergedConfig = useMemo(
        () => mergeOverrides(boss, values),
        [boss, values]
    )

    const handleReset = useCallback(() => {
        setValues(defaults)
    }, [setValues, defaults])

    const handleCopyDiff = useCallback(() => {
        const diff = {}
        for (const group of Object.keys(EDITABLE_RANGES)) {
            for (const field of Object.keys(EDITABLE_RANGES[group])) {
                const key = `${group}_${field}`
                const value = values[key]
                if (value === undefined) continue
                if (defaults[key] === value) continue
                diff[group] ??= {}
                diff[group][field] = value
            }
        }
        const text = JSON.stringify(diff, null, 4)
        navigator.clipboard?.writeText(text)
        console.log(`Override diff for "${boss.key}":`, diff)
    }, [values, defaults, boss.key])

    return (
        <div
            className="
                fixed
                inset-0
                z-50
                bg-black/80
                flex
                items-center
                justify-center
                p-6
            "
            onClick={onClose}
        >
            <div
                className="
                    border
                    border-cyan-300/40
                    bg-black/90
                    p-6
                    w-full
                    max-w-md
                    max-h-[90vh]
                    overflow-y-auto
                    flex
                    flex-col
                    items-center
                    gap-4
                    font-mono
                "
                onClick={(e) => e.stopPropagation()}
            >

                <div className="w-full flex justify-between items-center">
                    <div className="text-cyan-300/90 text-xs tracking-[0.2em]">
                        EDITING — {boss.name}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            cursor-pointer
                            text-white/40
                            hover:text-cyan-300
                            text-xs
                            tracking-[0.2em]
                        "
                    >
                        [X]
                    </button>
                </div>

                {/* Preview — updates on every slider drag, no debounce */}
                <div
                    className="
                        w-full
                        aspect-square
                        border
                        border-white/10
                        bg-black/50
                        flex
                        items-center
                        justify-center
                        overflow-hidden
                        p-4
                    "
                >
                    <BossIcon
                        config={mergedConfig}
                        className="w-full h-full max-w-full max-h-full"
                    />
                </div>

                <div className="w-full flex gap-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="
                            cursor-pointer
                            flex-1
                            py-2
                            uppercase
                            tracking-[0.2em]
                            text-[10px]
                            border
                            border-red-400/40
                            text-red-400/80
                            bg-black/40
                            hover:border-red-300
                            hover:text-red-300
                            transition-all
                            duration-200
                        "
                    >
                        Reset to Default
                    </button>

                    <button
                        type="button"
                        onClick={handleCopyDiff}
                        className="
                            cursor-pointer
                            flex-1
                            py-2
                            uppercase
                            tracking-[0.2em]
                            text-[10px]
                            border
                            border-[#39ff14]/40
                            text-[#39ff14]/70
                            bg-black/40
                            hover:border-cyan-300/70
                            hover:text-cyan-300
                            transition-all
                            duration-200
                        "
                    >
                        Copy Diff
                    </button>
                </div>

                <p
                    className="
                        text-white/40
                        text-[9px]
                        tracking-[0.15em]
                        leading-relaxed
                        text-center
                    "
                >
                    Drag sliders in the Leva panel — the preview above updates live.
                    "Copy Diff" copies only the fields you changed as JSON, ready to
                    paste into this boss's withDefaults({'{'}...{'}'}) block in bosses.js.
                </p>

            </div>
        </div>
    )
}


// ============================================================
// BOSS CARD
// ============================================================

function BossCard({ boss, onEdit }) {

    const svgWrapperRef = useRef(null)

    const handleDownload = useCallback(() => {
        const svgEl = svgWrapperRef.current?.querySelector('svg')
        if (!svgEl) return
        downloadSvg(svgEl, `${boss.key}.svg`)
    }, [boss.key])

    return (
        <div
            className="
                border
                border-[#39ff14]/40
                bg-black/40
                p-4
                flex
                flex-col
                items-center
                gap-3
            "
        >

            <div
                ref={svgWrapperRef}
                className="
                    w-full
                    aspect-square
                    border
                    border-white/10
                    bg-black/50
                    flex
                    items-center
                    justify-center
                    overflow-hidden
                    p-4
                "
            >
                <BossIcon
                    config={boss}
                    className="w-full h-full max-w-full max-h-full"
                />
            </div>

            <div
                className="
                    text-cyan-300/90
                    text-xs
                    tracking-[0.15em]
                    text-center
                    min-h-[1rem]
                "
            >
                {boss.name}
            </div>

            <div
                className="
                    text-white/30
                    text-[9px]
                    tracking-[0.2em]
                    uppercase
                "
            >
                {boss.key}
            </div>

            <div className="w-full flex gap-2">

                <button
                    type="button"
                    onClick={handleDownload}
                    className="
                        cursor-pointer
                        flex-1
                        py-2
                        uppercase
                        tracking-[0.2em]
                        text-[10px]
                        border
                        border-[#39ff14]/40
                        text-[#39ff14]/70
                        bg-black/40
                        hover:border-cyan-300/70
                        hover:text-cyan-300
                        transition-all
                        duration-200
                    "
                >
                    Download SVG
                </button>

                <button
                    type="button"
                    onClick={() => onEdit(boss.key)}
                    className="
                        cursor-pointer
                        flex-1
                        py-2
                        uppercase
                        tracking-[0.2em]
                        text-[10px]
                        border
                        border-cyan-300/40
                        text-cyan-300/70
                        bg-black/40
                        hover:border-[#39ff14]/70
                        hover:text-[#39ff14]
                        transition-all
                        duration-200
                    "
                >
                    Edit
                </button>

            </div>

        </div>
    )
}


export default function BossGallery({
    onBack,
}) {

    const [editingKey, setEditingKey] = useState(null)
    const editingBoss = BOSSES.find((b) => b.key === editingKey) ?? null

    return (
        <FlightLayout2
            title="BOSS GALLERY"
            footer="ASSET EXPORT"
            size="xl"
            centered={false}
            scrollable
        >

            <div
                className="
                    mx-auto
                    font-mono
                    text-xs
                    tracking-[0.2em]
                    text-white/80
                    w-full
                    max-w-6xl
                "
            >

                <div className="mb-6 flex justify-between items-center">

                    <div className="text-[#39ff14]/60 tracking-[0.25em]">
                        {BOSSES.length} SHIPS
                    </div>

                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="
                                cursor-pointer
                                px-4
                                py-2
                                uppercase
                                tracking-[0.3em]
                                text-[10px]
                                border
                                border-[#39ff14]/40
                                text-[#39ff14]/70
                                bg-black/40
                                hover:border-cyan-300/70
                                hover:text-cyan-300
                                transition-all
                                duration-200
                            "
                        >
                            Back
                        </button>
                    )}

                </div>

                <div
                    className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        lg:grid-cols-3
                        xl:grid-cols-4
                        gap-4
                    "
                >

                    {BOSSES.map((boss) => (
                        <BossCard
                            key={boss.key}
                            boss={boss}
                            onEdit={setEditingKey}
                        />
                    ))}

                </div>

            </div>

            {editingBoss && (
                <BossEditPanel
                    boss={editingBoss}
                    onClose={() => setEditingKey(null)}
                />
            )}

        </FlightLayout2>
    )
}