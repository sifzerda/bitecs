//src/pages/Other.jsx

//import { Link } from 'react-router-dom'

import { useState } from 'react'
import { BOSSES } from '../ecs/constants/bosses.js'
import { getGunTypeById } from '../ecs/weapons/config/gunConfigs.js'

const BOSS_SVGS = {
    shotgun: '/ship_svgs/01_shotgunboss.svg',
    machinegun: '/ship_svgs/02_machinegunboss.svg',
    cryogun: '/ship_svgs/03_cryogunboss.svg',
    grenadegun: '/ship_svgs/04_grenadelauncherboss.svg',
    acidthrowergun: '/ship_svgs/05_acidthrowerboss.svg',
    missilegun: '/ship_svgs/06_missilelauncherboss.svg',
    flamethrowergun: '/ship_svgs/07_flamethrowerboss.svg',
    lasergun: '/ship_svgs/08_lasergunboss.svg',
    arcgun: '/ship_svgs/09_arcgunboss.svg',
    plasmagun: '/ship_svgs/10_plasmagunboss.svg',
}

const SCALE = 100

const EMISSION_TYPES = [
    { id: 'projectile', label: 'BULLET / PROJECTILE' },
    { id: 'exhaust', label: 'EXHAUST' },
    { id: 'beam', label: 'BEAM' },
    { id: 'missile', label: 'MISSILE' },
    { id: 'thrower', label: 'THROWER' },
]

function getPoints(config = {}) {
    const gap = config.gunGap ?? config.engineGap ?? 0

    const x = config.offsetX ?? 0
    const y = (config.offsetY ?? 0) + (config.nozzleOffset ?? 0)

    return [
        { side: 'LEFT', x: x - gap, y },
        { side: 'RIGHT', x: x + gap, y },
    ]
}

export default function Other() {

    const [bossIndex, setBossIndex] = useState(0)
    const [emissionType, setEmissionType] = useState('projectile')
    const [refresh, setRefresh] = useState(0)
    const [imageSize, setImageSize] = useState(null)
    const [copied, setCopied] = useState(false)
    const [gunStatus, setGunStatus] = useState('loading')
    const [showBounds, setShowBounds] = useState(true)

    const boss = BOSSES[bossIndex]
    const emission = boss.emission
    const config = emission[emissionType]

    // --------------------------------------------------------
    // BOSS GUN (mirrors WeaponMount.jsx logic)
    // --------------------------------------------------------

    const gunType = boss.gun?.typeId ? getGunTypeById(boss.gun.typeId) : null
    const gunMount = gunType?.config?.mount
    const gunScale = boss.gun?.scale ?? gunMount?.scale ?? 1

    // Fall back to the gun type's mount offsets, same as WeaponMount.
    const gunOffsetX = boss.gun?.offsetX ?? gunMount?.offsetX ?? 0
    const gunOffsetY = boss.gun?.offsetY ?? gunMount?.offsetY ?? 0

    // three.js rotation.z is counter-clockwise; CSS rotate() is clockwise,
    // so the angle is negated to match the in-game orientation.
    const gunRotation = -(90 + (boss.gun?.rotation ?? 0) * (180 / Math.PI))
    const gunWidth = gunMount ? gunMount.width * 3 * gunScale * SCALE : 0
    const gunHeight = gunMount ? gunMount.height * 3 * gunScale * SCALE : 0

    // --------------------------------------------------------
    // UPDATE CONFIG
    // --------------------------------------------------------

    function updateValue(field, value) {

        config[field] = value
        // BOSSES is the live configuration object.
        // Updating it also updates consumers of this module.
        setRefresh(v => v + 1)
        setCopied(false)
    }

    // --------------------------------------------------------
    // COPY CONFIG
    // --------------------------------------------------------

    // Edits boss.gun directly (live object, same as emission above).
    // WeaponMount reads gunCfg.offsetX ?? mount.offsetX, so these
    // overrides also take effect in the game.
    function updateGun(field, value) {

        if (!boss.gun) return

        boss.gun[field] = value

        setRefresh(v => v + 1)
        setCopied(false)
    }

    function resetGun() {

        if (!boss.gun) return

        delete boss.gun.offsetX
        delete boss.gun.offsetY
        delete boss.gun.scale
        delete boss.gun.rotation
        delete boss.gun.mirrored

        setRefresh(v => v + 1)
        setCopied(false)
    }

    async function copyConfig() {

        const output = JSON.stringify({ gun: boss.gun, emission: boss.emission }, null, 4)

        try {
            await navigator.clipboard.writeText(output)
            setCopied(true)
        } catch {
            setCopied(false)
        }
    }

    // --------------------------------------------------------
    // VISUAL MARKERS
    // --------------------------------------------------------

    function renderPoints(pointConfig, color, label) {

        const points = getPoints(pointConfig)

        return points.map(point => {

            const left = `calc(50% + ${point.x * SCALE}px)`
            const top = `calc(50% - ${point.y * SCALE}px)`

            return (
                <div key={`${label}-${point.side}`}
                    className="absolute z-20 pointer-events-none"
                    style={{ left, top, transform: 'translate(-50%, -50%)' }}>
                    <div className={`w-4 h-4 rounded-full border-2 border-white ${color} shadow-[0_0_15px_currentColor]`} />

                    <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold tracking-widest text-white bg-black/80 px-1.5 py-1 rounded">
                        {label} {point.side}
                    </div>

                    <div className="absolute w-2 h-2 rounded-full border border-white/40 -top-3 -left-3" />
                </div>
            )
        })
    }

    // --------------------------------------------------------
    // UI
    // --------------------------------------------------------

    return (
        <div className="w-full min-h-screen bg-[#080b12] text-white p-4 md:p-6 overflow-y-auto">

            <div className="max-w-350 mx-auto space-y-5">

                {/* HEADER */}

                <div className="flex flex-wrap justify-between items-center gap-4">

                    <div>
                        <h1 className="text-xl font-bold tracking-[0.2em]">BOSS EMISSION EDITOR</h1>
                        <p className="text-xs text-white/40 mt-1 tracking-widest">EMISSION COORDINATES / VISUAL DEBUGGER</p>
                    </div>

                    <button onClick={copyConfig} className="px-4 py-2 bg-cyan-500/10 border border-cyan-400/40 hover:bg-cyan-500/20 text-cyan-300 text-xs tracking-widest rounded">{copied ? 'COPIED!' : 'COPY BOSS CONFIG'}</button>

                </div>

                {/* BOSS SELECT */}

                <div className="flex flex-wrap gap-2">

                    {BOSSES.map((item, index) => (

                        <button key={item.key} onClick={() => {
                                setBossIndex(index)
                                setImageSize(null)
                                setGunStatus('loading')
                            }}
                            className={`px-3 py-2 text-[10px] tracking-widest border rounded transition-colors ${bossIndex === index ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/5 border-white/10 text-white/50 hover:border-white/40'}`}>{item.name}</button>
                    ))}

                </div>

                {/* MAIN LAYOUT */}

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">

                    {/* VISUAL PREVIEW */}

                    <div className="border border-white/10 rounded-lg bg-[#0b101b] overflow-hidden">

                        <div className="flex justify-between items-center px-4 py-3 border-b border-white/10">

                            <div>
                                <div className="text-xs font-bold tracking-widest text-white/90">{boss.name}</div>
                                <div className="text-[9px] text-white/40 tracking-widest mt-1">TOP-DOWN EMISSION PREVIEW</div>
                            </div>

                            <div className="text-[9px] text-cyan-300 tracking-widest">SCALE: 100 PX / UNIT</div>

                        </div>

                        {/* STAGE */}

                        <div className="relative w-full overflow-hidden"
                            style={{
                                height: 'min(70vw, 560px)',
                                minHeight: '360px',
                                backgroundImage: `linear-gradient(rgba(40,120,160,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(40,120,160,0.07) 1px, transparent 1px), radial-gradient(ellipse at center, #172334 0%, #080d17 75%)`,
                                backgroundSize: '25px 25px, 25px 25px, 100% 100%',
                            }}>

                            {/* CENTRE AXES */}

                            <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-white/10" />
                            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-white/10" />

                            {/* BOSS SVG */}

                            <img key={boss.key} src={BOSS_SVGS[boss.key]} alt={boss.name}
                                onLoad={e => { setImageSize({ width: e.currentTarget.naturalWidth })}}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
                                style={{ width: imageSize ? `${imageSize.width / 2.8}px` : '360px', maxWidth: 'none', height: 'auto', opacity: 0.95 }} />

                            {/* BOSS GUNS */}

                            {gunType && gunMount && boss.gun?.enabled !== false && (

                                // Dedicated layer above the boss image (z-15) and below
                                // the emission markers (z-20).
                                <div className="absolute inset-0 z-[15] pointer-events-none">

                                    {(boss.gun.mirrored === false ? [gunOffsetX] : [-gunOffsetX, gunOffsetX]).map((x, index) => (

                                        <div key={`gun-${boss.key}-${index}`} className="absolute"
                                            style={{ left: `calc(50% + ${x * SCALE}px)`, top: `calc(50% - ${gunOffsetY * SCALE}px)`, width: `${gunWidth}px`, height: `${gunHeight}px`, transform: `translate(-50%, -50%) rotate(${gunRotation}deg)` }}>

                                            <img src={gunType.svg} alt={`${gunType.name} gun`} draggable={false} onLoad={e => setGunStatus(`LOADED (${e.currentTarget.naturalWidth}x${e.currentTarget.naturalHeight})`
                                                )} onError={() => setGunStatus('FAILED TO LOAD')} className="block select-none" style={{ width: '100%', height: '100%', maxWidth: 'none', objectFit: 'fill', }} />

                                            {showBounds && (<div className="absolute inset-0 border border-dashed border-yellow-300/80" />)}

                                        </div>

                                    ))}

                                </div>

                            )}

                            {/* CENTRE MARKER */}

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-white/50 rounded-full z-10" />

                            {/* EXHAUST POINTS */}

                            {renderPoints(emission.exhaust, 'bg-cyan-400 text-cyan-400', 'EXHAUST')}

                            {/* SELECTED EMISSION POINTS */}

                            {emissionType !== 'exhaust' && renderPoints(config, 'bg-orange-400 text-orange-400', emissionType === 'projectile' ? 'BULLET' : emissionType.toUpperCase())}

                            {/* SCALE INDICATOR */}

                            <div className="absolute bottom-4 left-4 text-[9px] text-white/40 tracking-widest">ORIGIN: BOSS CENTRE</div>

                        </div>

                        {/* LEGEND */}

                        <div className="flex flex-wrap gap-5 px-4 py-3 border-t border-white/10">

                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-cyan-400" />
                                <span className="text-[9px] text-white/60 tracking-widest">EXHAUST</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-400" />
                                <span className="text-[9px] text-white/60 tracking-widest">SELECTED EMISSION</span>
                            </div>

                            <div className="text-[9px] text-white/30 ml-auto">L = LEFT / R = RIGHT</div>

                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border border-white bg-white/50" />
                                <span className="text-[9px] text-white/60 tracking-widest">BOSS GUN</span>
                            </div>

                        </div>

                    </div>

                    {/* CONTROLS */}

                    <div className="space-y-4">

                        {/* EMISSION SELECT */}

                        <div className="bg-[#0b101b] border border-white/10 rounded-lg p-4">

                            <h2 className="text-xs font-bold tracking-widest mb-3">EMISSION TYPE</h2>

                            <div className="grid grid-cols-1 gap-2">

                                {EMISSION_TYPES.map(type => (<button key={type.id} onClick={() => setEmissionType(type.id)} className={`text-left px-3 py-3 text-[10px] tracking-widest border rounded ${emissionType === type.id ? 'border-orange-400/70 bg-orange-400/10 text-orange-300' : 'border-white/10 bg-white/2 text-white/50 hover:border-white/30'}`}> {type.label}</button>

                                ))}

                            </div>

                        </div>

                        {/* COORDINATE CONTROLS */}

                        <div className="bg-[#0b101b] border border-white/10 rounded-lg p-4">

                            <div className="flex justify-between items-center mb-4">

                                <h2 className="text-xs font-bold tracking-widest">COORDINATES</h2>

                                <span className="text-[9px] text-orange-300 tracking-widest">LIVE EDIT</span>

                            </div>

                            <div className="space-y-4">

                                {[
                                    {
                                        field: 'offsetX',
                                        label: 'OFFSET X',
                                        description: 'Horizontal position',
                                    },
                                    {
                                        field: 'offsetY',
                                        label: 'OFFSET Y',
                                        description: 'Forward / backward position',
                                    },
                                    {
                                        field: emissionType === 'exhaust'
                                            ? 'engineGap'
                                            : 'gunGap',
                                        label: emissionType === 'exhaust'
                                            ? 'ENGINE GAP'
                                            : 'GUN GAP',
                                        description: 'Distance between left and right points',
                                    },
                                    {
                                        field: 'nozzleOffset',
                                        label: 'NOZZLE OFFSET',
                                        description: 'Additional local Y offset',
                                    },
                                ].map(item => (

                                    <div key={item.field}>

                                        <div className="flex justify-between items-center mb-1">

                                            <label className="text-[10px] tracking-widest text-white/80">{item.label}</label>
                                            <span className="text-[9px] text-white/30">{item.description}</span>

                                        </div>

                                        <input type="number" step="0.01" value={config[item.field] ?? 0}
                                            onChange={e => updateValue(item.field, Number(e.target.value))}
                                            className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-sm text-cyan-300 font-mono outline-none focus:border-cyan-400" />

                                    </div>

                                ))}

                            </div>

                        </div>

                        {/* GUN POSITION */}

                        {boss.gun && (

                            <div className="bg-[#0b101b] border border-white/10 rounded-lg p-4">

                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xs font-bold tracking-widest">GUN POSITION</h2>
                                    <button onClick={resetGun} className="px-2 py-1 text-[9px] tracking-widest border border-white/20 text-white/60 hover:border-white/50 rounded">RESET TO MOUNT</button>

                                </div>

                                <div className="space-y-4">

                                    {[
                                        {
                                            field: 'offsetX',
                                            label: 'GUN OFFSET X',
                                            description: 'Distance from centre (mirrored)',
                                            step: 0.01,
                                            value: gunOffsetX,
                                            onChange: v => updateGun('offsetX', v),
                                        },
                                        {
                                            field: 'offsetY',
                                            label: 'GUN OFFSET Y',
                                            description: 'Forward / backward',
                                            step: 0.01,
                                            value: gunOffsetY,
                                            onChange: v => updateGun('offsetY', v),
                                        },
                                        {
                                            field: 'scale',
                                            label: 'GUN SCALE',
                                            description: 'Size multiplier',
                                            step: 0.05,
                                            value: gunScale,
                                            onChange: v => updateGun('scale', v),
                                        },
                                        {
                                            field: 'rotation',
                                            label: 'GUN ROTATION (DEG)',
                                            description: 'Extra rotation, stored in radians',
                                            step: 1,
                                            value: Number(((boss.gun.rotation ?? 0) * (180 / Math.PI)).toFixed(2)),
                                            onChange: v => updateGun('rotation', v * (Math.PI / 180)),
                                        },
                                    ].map(item => (

                                        <div key={item.field}>

                                            <div className="flex justify-between items-center mb-1">

                                                <label className="text-[10px] tracking-widest text-white/80">{item.label}</label>

                                                <span className="text-[9px] text-white/30">{item.description}</span>

                                            </div>

                                            <input type="number" step={item.step} value={item.value} onChange={e => item.onChange(Number(e.target.value))} className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-sm text-yellow-300 font-mono outline-none focus:border-yellow-300" />

                                        </div>

                                    ))}

                                    <label className="flex items-center gap-2 text-[10px] text-white/70 tracking-widest cursor-pointer">
                                        <input type="checkbox" checked={boss.gun.mirrored !== false} onChange={e => updateGun('mirrored', e.target.checked)} />MIRRORED (TWO GUNS)</label>

                                </div>

                            </div>

                        )}

                        {/* GUN DEBUG */}

                        <div className="bg-[#0b101b] border border-white/10 rounded-lg p-4">

                            <div className="flex justify-between items-center mb-3">

                                <h2 className="text-xs font-bold tracking-widest">BOSS GUN DEBUG</h2>

                                <label className="flex items-center gap-2 text-[9px] text-white/60 tracking-widest cursor-pointer">
                                    <input type="checkbox" checked={showBounds} onChange={e => setShowBounds(e.target.checked)} />SHOW BOUNDS</label>

                            </div>

                            <div className="space-y-1 text-[10px] font-mono text-white/70 break-all">
                                <div>typeId: {boss.gun?.typeId ?? 'none'}</div>
                                <div>svg: {gunType?.svg ?? 'none'}</div>
                                <div className={gunStatus.startsWith('FAILED') ? 'text-red-400' : 'text-cyan-300'}>
                                    status: {gunStatus}
                                </div>
                                <div>offset: {gunOffsetX} / {gunOffsetY}</div>
                                <div>scale: {gunScale} | rot: {gunRotation.toFixed(0)}deg</div>
                                <div>box px: {gunWidth.toFixed(0)} x {gunHeight.toFixed(0)}</div>
                            </div>

                        </div>

                        {/* POINT READOUT */}

                        <div className="bg-[#0b101b] border border-white/10 rounded-lg p-4">

                            <h2 className="text-xs font-bold tracking-widest mb-3">EMISSION POINT READOUT</h2>

                            {getPoints(config).map(point => (

                                <div key={point.side} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">

                                    <span className="text-[10px] text-white/60">{point.side}</span>
                                    <span className="text-xs font-mono text-orange-300"> X: {point.x.toFixed(3)} {' / '} Y: {point.y.toFixed(3)}</span>

                                </div>

                            ))}

                            <div className="text-[9px] text-white/30 mt-3">Coordinates are relative to the boss centre.</div>

                        </div>

                    </div>

                </div>

                {/* CONFIG OUTPUT */}

                <div className="border border-white/10 rounded-lg bg-[#0b101b] p-4">

                    <div className="flex justify-between items-center mb-3">

                        <h2 className="text-xs font-bold tracking-widest">CURRENT BOSS EMISSION CONFIG</h2>

                        <span className="text-[9px] text-cyan-300">{boss.key.toUpperCase()}</span>

                    </div>

                    <pre className="text-[10px] md:text-xs text-cyan-300/80 font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                        {JSON.stringify({ gun: boss.gun, emission: boss.emission }, null, 4)}
                    </pre>

                </div>

            </div>

        </div>
    )
}