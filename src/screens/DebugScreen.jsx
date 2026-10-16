// src/screens/DebugScreen.jsx

import { useState, useEffect, useCallback, useMemo, useRef, Component, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import FlightLayout2 from '../components/FlightLayout2.jsx'
import { useGameStore, SCREEN } from '../../store/gameStore.js'
import { GUN_TYPES } from '../ecs/weapons/config/gunConfigs.js'
import { BOSSES } from '../ecs/constants/bosses.js'
import { PLAYER_CONFIG } from '../ecs/constants/emission.js'
import * as WeaponMountModule from '../renderers/WeaponMount.jsx'
import { getShipPlaneSize, PX_TO_WORLD, TEXTURE_SCALE } from '../renderers/shipSizing.js'

// ============================================================
// ASSETS
// ============================================================

const PLAYER_SVG = '/ship_svgs/00_player.svg'

const BOSS_SVG_BY_KEY = {
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

// ============================================================
// DEBUG SECTIONS
// ============================================================

const SECTIONS = [
  { id: 'ships', label: 'SHIPS' },
  { id: 'bosses', label: 'BOSSES' },
  { id: 'effects', label: 'EFFECTS' },
  { id: 'guns', label: 'GUNS' },
  { id: 'sprites', label: 'SPRITES' },
]

// ============================================================
// SHARED 3D PREVIEW STAGE
// ============================================================

function CameraZoom({ zoom }) {
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }, [camera, zoom])

  return null
}

function DebugStage({
  children,
  height = 'h-96',
  camera = [0, 0, 6],
  orthographic = false,
  zoom = 70,
}) {
  return (
    <div
      className={`
        relative
        w-full
        ${height}
        border
        border-cyan-300/20
        bg-black/70
        overflow-hidden
      `}
    >
      {/* scanline overlay */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-10
          opacity-[0.06]
          bg-[repeating-linear-gradient(
            to_bottom,
            transparent 0px,
            transparent 3px,
            #00ffff 4px
          )]
        "
      />

      <Canvas
        orthographic={orthographic}
        camera={
          orthographic
            ? { zoom, position: camera, near: 0.1, far: 100 }
            : { position: camera, fov: 50 }
        }
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        {orthographic && <CameraZoom zoom={zoom} />}

        <ambientLight intensity={0.7} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, -4, 3]} intensity={0.5} />

        {children}
      </Canvas>

      <div className="
        pointer-events-none
        absolute
        bottom-2
        left-2
        z-20
        text-[8px]
        tracking-[0.25em]
        text-cyan-300/30
      ">
        DEBUG VISUALIZER
      </div>
    </div>
  )
}


// ============================================================
// GENERIC SHIP IMAGE
//
// Sized exactly like the game (see renderers/shipSizing.js): the plane comes
// from the SVG's own pixel size, so it is never squashed.
// ============================================================

function PreviewShip({
  src,
  rotation = 0,
  glow = true,
  bob = true,
}) {
  const texture = useTexture(src)
  const groupRef = useRef()

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  const [planeW, planeH] = getShipPlaneSize(texture)

  useFrame((state) => {
    if (!groupRef.current || !bob) return

    groupRef.current.position.y =
      Math.sin(state.clock.elapsedTime * 1.4) * 0.06
  })

  return (
    <group
      ref={groupRef}
      rotation={[0, 0, rotation]}
    >
      {glow && (
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[planeW * 0.72, planeH * 0.72]} />
          <meshBasicMaterial
            color="#00eaff"
            transparent
            opacity={0.055}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      <mesh>
        <planeGeometry args={[planeW, planeH]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.05}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}


// ============================================================
// SHIP CARD
// ============================================================

function ShipCard({
  name,
  label,
  src,
  selected,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        text-left
        border
        p-2
        cursor-pointer
        transition-all
        duration-150

        ${selected
          ? `
            border-cyan-300
            bg-cyan-400/10
            shadow-[0_0_20px_rgba(0,255,255,0.18)]
          `
          : `
            border-white/10
            bg-black/40
            hover:border-cyan-300/50
            hover:bg-cyan-400/5
          `
        }
      `}
    >
      <div
        className="
          h-24
          flex
          items-center
          justify-center
          border
          border-white/10
          bg-black/50
          overflow-hidden
        "
      >
        <img
          src={src}
          alt={name}
          className="
            max-w-[85%]
            max-h-[85%]
            object-contain
            transition-transform
            duration-200
            group-hover:scale-110
          "
        />
      </div>

      <div className="
        mt-2
        text-cyan-300
        text-[10px]
        tracking-[0.16em]
        truncate
      ">
        {name}
      </div>

      <div className="
        mt-1
        text-white/35
        text-[8px]
        tracking-widest
        truncate
      ">
        {label}
      </div>
    </button>
  )
}


// ============================================================
// SHIP EDITOR
//
// Edit where each ship's guns and exhaust come from, on a ship drawn at its
// real in-game size. Coordinates are in world units, local to the ship:
// +Y is forward (nose), +X is right, (0, 0) is the ship's centre. This is the
// same space emission.js uses.
//
//   gun muzzles    x = offsetX +/- gunGap          y = offsetY
//   exhaust points x = +/- engineGap               y = nozzleOffset   (what ExhaustRenderer uses)
//
// The guns are drawn by the game's own WeaponMount, so what you see is what
// the game draws. Gun size and placement are the gun's mount values:
//   offsetX  distance from the centre line to each gun (guns are mirrored)
//   offsetY  how far forward the gun's mount sits
//   scale    size of the gun model
//
// "Apply to running game" writes your edits into BOSSES / PLAYER_CONFIG /
// GUN_TYPES in memory, so starting a game without reloading uses them.
// Reloading the page resets the game's config; copy the export into
// bosses.js / emission.js / gunConfigs.js to keep a change.
// ============================================================

// Whatever WeaponMount.jsx exports to draw a gun from a gunCfg.
const WeaponMount =
  WeaponMountModule.default ??
  WeaponMountModule.WeaponMount ??
  (() => null)

const WEAPON_TYPES = ['projectile', 'beam', 'missile', 'thrower']
const EDITOR_STORE = 'debug.shipEditor.v2'

const clone = (v) => JSON.parse(JSON.stringify(v ?? {}))
const snap = (v) => Math.round(v * 100) / 100
const show = (v) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0)

function sameGun(a = {}, b = {}) {
  return (
    (a.offsetX ?? 0) === (b.offsetX ?? 0) &&
    (a.offsetY ?? 0) === (b.offsetY ?? 0) &&
    (a.gunGap ?? 0) === (b.gunGap ?? 0)
  )
}

function mountOf(typeId, override = {}) {
  const m = GUN_TYPES.find((g) => g.id === typeId)?.config?.mount ?? {}

  return {
    offsetX: override.offsetX ?? m.offsetX ?? 0,
    offsetY: override.offsetY ?? m.offsetY ?? 0,
    scale: override.scale ?? m.scale ?? 1,
  }
}

function makeDefault(emission, mounts) {
  const e = clone(emission)

  return {
    emission: e,
    // gun type id -> { offsetX, offsetY, scale }
    mounts,
    // Link weapon types only when they already share one muzzle position.
    link: WEAPON_TYPES.every((t) => sameGun(e[t], e.projectile)),
  }
}

const DEFAULT_EDITS = (() => {
  const playerMounts = {}
  GUN_TYPES.forEach((g) => {
    playerMounts[g.id] = mountOf(g.id)
  })

  const out = { player: makeDefault(PLAYER_CONFIG.emission, playerMounts) }

  BOSSES.forEach((boss) => {
    const typeId = boss.gun?.typeId
    const mounts = typeId ? { [typeId]: mountOf(typeId, boss.gun) } : {}
    out[boss.key] = makeDefault(boss.emission, mounts)
  })

  return out
})()

function loadEditor() {
  const edits = clone(DEFAULT_EDITS)
  let applyLive = true

  try {
    const saved = JSON.parse(localStorage.getItem(EDITOR_STORE) || 'null')

    if (saved?.edits) {
      Object.keys(edits).forEach((id) => {
        const s = saved.edits[id]
        if (!s) return

        edits[id] = {
          ...edits[id],
          ...s,
          emission: { ...edits[id].emission, ...(s.emission ?? {}) },
          mounts: { ...edits[id].mounts, ...(s.mounts ?? {}) },
        }
      })
    }

    if (typeof saved?.applyLive === 'boolean') applyLive = saved.applyLive
  } catch {
    // storage unavailable, use defaults
  }

  return { edits, applyLive }
}

function saveEditor(edits, applyLive) {
  try {
    localStorage.setItem(EDITOR_STORE, JSON.stringify({ edits, applyLive }))
  } catch {
    // ignore
  }
}

function applyToGame(id, edit) {
  const boss = id === 'player' ? null : BOSSES.find((b) => b.key === id)
  const target = id === 'player' ? PLAYER_CONFIG.emission : boss?.emission

  if (!target) return

  ;['exhaust', ...WEAPON_TYPES].forEach((type) => {
    target[type] = { ...(target[type] ?? {}), ...(edit.emission[type] ?? {}) }
  })

  Object.keys(edit.mounts ?? {}).forEach((typeId) => {
    const m = edit.mounts[typeId]

    if (boss) {
      // bosses carry their own gun placement
      boss.gun = { ...(boss.gun ?? {}), typeId, ...m }
    } else {
      // the player's gun placement lives on the gun type
      const type = GUN_TYPES.find((g) => g.id === typeId)
      if (type) Object.assign(type.config.mount, m)
    }
  })
}

function buildExport(edits) {
  const out = {}

  Object.keys(edits).forEach((id) => {
    const e = edits[id]

    if (id === 'player') {
      out[id] = { emission: e.emission, gunMounts: e.mounts }
      return
    }

    const typeId = Object.keys(e.mounts)[0]

    out[id] = {
      emission: e.emission,
      gun: typeId ? { typeId, ...e.mounts[typeId] } : undefined,
    }
  })

  return (
    '// player.emission -> PLAYER_CONFIG.emission in emission.js\n' +
    '// player.gunMounts -> each gun type\'s mount in gunConfigs.js\n' +
    '// boss keys -> that boss\'s emission and gun in bosses.js\n' +
    'export const SHIP_EDITOR_EXPORT = ' +
    JSON.stringify(out, null, 2) +
    '\n'
  )
}

function useSvgPx(src) {
  const [px, setPx] = useState(null)

  useEffect(() => {
    let alive = true
    const img = new Image()

    img.onload = () => {
      if (alive) setPx({ w: img.naturalWidth, h: img.naturalHeight })
    }

    img.src = src
    return () => {
      alive = false
    }
  }, [src])

  return px
}

// ------------------------------------------------------------
// 3D pieces
// ------------------------------------------------------------

// A gun that fails to draw must not take the whole screen down.
class GunBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    this.props.onError?.(String(error?.message ?? error))
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function Dot({ x, y, color, onDown }) {
  return (
    <group position={[x, y, 0.3]}>
      <mesh renderOrder={50} onPointerDown={onDown}>
        <circleGeometry args={[0.2, 20]} />
        <meshBasicMaterial transparent opacity={0} depthTest={false} depthWrite={false} />
      </mesh>

      <mesh renderOrder={51}>
        <circleGeometry args={[0.065, 20]} />
        <meshBasicMaterial color={color} transparent depthTest={false} toneMapped={false} />
      </mesh>

      <mesh renderOrder={51}>
        <ringGeometry args={[0.1, 0.12, 28]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Stick({ x, y, length, dir, color }) {
  return (
    <mesh position={[x, y + (dir * length) / 2, 0.29]} renderOrder={48}>
      <planeGeometry args={[0.014, length]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} depthTest={false} toneMapped={false} />
    </mesh>
  )
}

function EditorScene({
  src,
  gunCfg,
  edit,
  weaponType,
  showGrid,
  showGuns,
  showMarkers,
  onGunError,
  onDragGun,
  onDragMount,
  onDragExhaust,
}) {
  const drag = useRef(null)

  useEffect(() => {
    const up = () => {
      drag.current = null
    }

    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const gun = edit.emission[weaponType] ?? {}
  const exhaust = edit.emission.exhaust ?? {}

  const gunGap = gun.gunGap ?? 0
  const gunY = gun.offsetY ?? 0
  const gunXs = [(gun.offsetX ?? 0) - gunGap, (gun.offsetX ?? 0) + gunGap]

  const mount = gunCfg ?? {}
  const mountX = mount.offsetX ?? 0
  const mountY = mount.offsetY ?? 0

  const exGap = exhaust.engineGap ?? 0
  // ExhaustRenderer spawns particles at (+/- engineGap, nozzleOffset) from the
  // ship centre; it does not read the emission offsetX / offsetY.
  const exY = exhaust.nozzleOffset ?? 0
  const exXs = [-exGap, exGap]

  return (
    <>
      {showGrid && (
        <>
          <gridHelper
            args={[24, 48, '#1f6f78', '#12353a']}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, -0.2]}
          />
          <mesh position={[0, 0, -0.15]}>
            <planeGeometry args={[0.012, 24]} />
            <meshBasicMaterial color="#2aa6b3" transparent opacity={0.5} />
          </mesh>
          <mesh position={[0, 0, -0.15]}>
            <planeGeometry args={[24, 0.012]} />
            <meshBasicMaterial color="#2aa6b3" transparent opacity={0.5} />
          </mesh>
        </>
      )}

      <PreviewShip src={src} glow={false} bob={false} />

      {showGuns && gunCfg && (
        <GunBoundary
          key={`${gunCfg.typeId}`}
          onError={onGunError}
        >
          <Suspense fallback={null}>
            <group position={[0, 0, 0.1]}>
              <WeaponMount gunCfg={gunCfg} />
            </group>
          </Suspense>
        </GunBoundary>
      )}

      {showMarkers && (
        <>
          {gunCfg && [-mountX, mountX].map((x, i) => (
            <Dot
              key={`m${i}`}
              x={x}
              y={mountY}
              color="#ff3df0"
              onDown={(e) => {
                e.stopPropagation()
                drag.current = onDragMount
              }}
            />
          ))}

          {gunXs.map((x, i) => (
            <group key={`g${i}`}>
              <Stick x={x} y={gunY} length={0.5} dir={1} color="#00eaff" />
              <Dot
                x={x}
                y={gunY}
                color="#00eaff"
                onDown={(e) => {
                  e.stopPropagation()
                  drag.current = onDragGun
                }}
              />
            </group>
          ))}

          {exXs.map((x, i) => (
            <group key={`e${i}`}>
              <Stick x={x} y={exY} length={0.45} dir={-1} color="#ff7a1a" />
              <Dot
                x={x}
                y={exY}
                color="#ff7a1a"
                onDown={(e) => {
                  e.stopPropagation()
                  drag.current = onDragExhaust
                }}
              />
            </group>
          ))}
        </>
      )}

      {/* invisible plane that receives the drag movement */}
      <mesh
        position={[0, 0, 0.2]}
        onPointerMove={(e) => {
          if (drag.current) drag.current(e.point.x, e.point.y)
        }}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
    </>
  )
}

// ------------------------------------------------------------
// Controls
// ------------------------------------------------------------

function NumField({ label, value, onChange, step = 0.01 }) {
  return (
    <label className="
      flex
      items-center
      justify-between
      gap-2
      text-[8px]
      tracking-widest
      text-white/45
    ">
      <span>{label}</span>

      <input
        type="number"
        step={step}
        value={show(value)}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!Number.isNaN(v)) onChange(v)
        }}
        className="
          w-24
          bg-black/60
          border
          border-white/15
          text-cyan-300
          text-[10px]
          px-1
          py-0.5
          font-mono
        "
      />
    </label>
  )
}

function PanelTitle({ children, color = 'text-cyan-300/80' }) {
  return (
    <div className={`text-[8px] tracking-[0.25em] ${color}`}>
      {children}
    </div>
  )
}

function SmallButton({ children, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        cursor-pointer
        border
        px-2
        py-1
        text-[8px]
        tracking-widest
        ${active
          ? 'border-cyan-300 text-cyan-300 bg-cyan-400/10'
          : 'border-white/15 text-white/50 hover:border-cyan-300/60'
        }
      `}
    >
      {children}
    </button>
  )
}

// ============================================================
// SHIPS
// ============================================================

function ShipsSection() {
  const [selected, setSelected] = useState('player')
  const initial = useMemo(() => loadEditor(), [])
  const [edits, setEdits] = useState(initial.edits)
  const [applyLive, setApplyLive] = useState(initial.applyLive)

  const [weaponType, setWeaponType] = useState('projectile')
  const [zoom, setZoom] = useState(70)
  const [showGrid, setShowGrid] = useState(true)
  const [showGuns, setShowGuns] = useState(true)
  const [showMarkers, setShowMarkers] = useState(true)
  const [gunError, setGunError] = useState('')
  const [playerGunId, setPlayerGunId] = useState(GUN_TYPES[0]?.id)
  const [copied, setCopied] = useState('')

  const ships = useMemo(() => [
    {
      id: 'player',
      name: 'PLAYER SHIP',
      label: '00_player',
      src: PLAYER_SVG,
    },

    ...BOSSES
      .filter((boss) => boss.isShip !== false)
      .map((boss) => ({
        id: boss.key,
        name: boss.name,
        label: boss.key,
        src: BOSS_SVG_BY_KEY[boss.key],
      })),
  ], [])

  const selectedShip = ships.find((ship) => ship.id === selected) ?? ships[0]
  const edit = edits[selectedShip.id]

  const gunTypeId =
    selectedShip.id === 'player'
      ? playerGunId
      : BOSSES.find((b) => b.key === selectedShip.id)?.gun?.typeId

  const mount = gunTypeId ? (edit.mounts[gunTypeId] ?? mountOf(gunTypeId)) : null

  const gunCfg = mount
    ? { enabled: true, typeId: gunTypeId, ...mount, mirrored: true }
    : null

  const px = useSvgPx(selectedShip.src)
  const worldW = px ? (px.w / TEXTURE_SCALE) * PX_TO_WORLD : 0
  const worldH = px ? (px.h / TEXTURE_SCALE) * PX_TO_WORLD : 0

  // keep storage and the running game in step with the edits
  useEffect(() => {
    saveEditor(edits, applyLive)

    if (applyLive) {
      Object.keys(edits).forEach((id) => applyToGame(id, edits[id]))
    }
  }, [edits, applyLive])

  const patch = useCallback((fn) => {
    setEdits((prev) => {
      const id = selectedShip.id
      const next = clone(prev[id])

      fn(next)

      if (next.link) {
        const p = next.emission.projectile ?? {}

        WEAPON_TYPES.forEach((t) => {
          if (t === 'projectile') return

          next.emission[t] = {
            ...(next.emission[t] ?? {}),
            offsetX: p.offsetX,
            offsetY: p.offsetY,
            gunGap: p.gunGap,
          }
        })
      }

      return { ...prev, [id]: next }
    })
  }, [selectedShip.id])

  const setGun = (key, value) => patch((e) => {
    e.emission[weaponType] = { ...(e.emission[weaponType] ?? {}), [key]: value }
  })

  const setExhaust = (key, value) => patch((e) => {
    e.emission.exhaust = { ...(e.emission.exhaust ?? {}), [key]: value }
  })

  const setMount = (key, value) => patch((e) => {
    if (!gunTypeId) return
    e.mounts[gunTypeId] = { ...(e.mounts[gunTypeId] ?? mountOf(gunTypeId)), [key]: value }
  })

  const dragMount = useCallback((x, y) => patch((e) => {
    if (!gunTypeId) return
    e.mounts[gunTypeId] = {
      ...(e.mounts[gunTypeId] ?? mountOf(gunTypeId)),
      offsetX: snap(Math.abs(x)),
      offsetY: snap(y),
    }
  }), [patch, gunTypeId])

  const gun = edit.emission[weaponType] ?? {}
  const exhaust = edit.emission.exhaust ?? {}

  const dragGun = useCallback((x, y) => patch((e) => {
    const g = e.emission[weaponType] ?? {}

    e.emission[weaponType] = {
      ...g,
      gunGap: snap(Math.abs(x - (g.offsetX ?? 0))),
      offsetY: snap(y),
    }
  }), [patch, weaponType])

  const dragExhaust = useCallback((x, y) => patch((e) => {
    const g = e.emission.exhaust ?? {}

    e.emission.exhaust = {
      ...g,
      engineGap: snap(Math.abs(x)),
      nozzleOffset: snap(y),
    }
  }), [patch])

  const resetShip = () => {
    const id = selectedShip.id

    setEdits((prev) => ({ ...prev, [id]: clone(DEFAULT_EDITS[id]) }))
  }

  const resetAll = () => setEdits(clone(DEFAULT_EDITS))

  const exportText = useMemo(() => buildExport(edits), [edits])

  const copyExport = () => {
    const done = () => {
      setCopied('COPIED')
      setTimeout(() => setCopied(''), 2000)
    }

    const fallback = () => {
      const ta = document.getElementById('ship-editor-export')
      if (!ta) return
      ta.focus()
      ta.select()
      try {
        document.execCommand('copy')
        done()
      } catch {
        setCopied('SELECT AND COPY')
      }
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(exportText).then(done, fallback)
    } else {
      fallback()
    }
  }

  return (
    <div className="space-y-4">

      <div className="
        grid
        grid-cols-1
        xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]
        gap-4
      ">

        {/* ==================================================
            EDITOR STAGE
            ================================================== */}

        <div className="
          border
          border-cyan-300/20
          bg-black/60
          overflow-hidden
        ">

          <div className="
            px-3
            py-2
            border-b
            border-cyan-300/10
            bg-cyan-400/5
            flex
            items-center
            justify-between
            gap-3
          ">
            <div className="min-w-0">
              <div className="text-cyan-300 text-[9px] tracking-[0.25em] truncate">
                {selectedShip.name}
              </div>

              <div className="mt-1 text-white/25 text-[7px] tracking-widest">
                {selectedShip.id}
                {px && (
                  <>
                    {'  '}·{'  '}
                    {show(worldW)} × {show(worldH)} UNITS
                    {'  '}·{'  '}
                    {Math.round(px.w / TEXTURE_SCALE)} × {Math.round(px.h / TEXTURE_SCALE)} PX
                  </>
                )}
              </div>
            </div>

            <div className="text-white/20 text-[7px] tracking-widest shrink-0">
              DRAG THE DOTS
            </div>
          </div>

          <DebugStage
            height="h-[30rem]"
            camera={[0, 0, 10]}
            orthographic
            zoom={zoom}
          >
            {selectedShip.src && (
              <EditorScene
                key={selectedShip.id}
                src={selectedShip.src}
                gunCfg={gunCfg}
                edit={edit}
                weaponType={weaponType}
                showGrid={showGrid}
                showGuns={showGuns}
                showMarkers={showMarkers}
                onGunError={setGunError}
                onDragGun={dragGun}
                onDragMount={dragMount}
                onDragExhaust={dragExhaust}
              />
            )}
          </DebugStage>

          <div className="
            px-3
            py-2
            border-t
            border-white/10
            bg-black/40
            flex
            flex-wrap
            items-center
            gap-x-4
            gap-y-2
            text-[8px]
            tracking-widest
            text-white/45
          ">
            <label className="flex items-center gap-2">
              ZOOM
              <input
                type="range"
                min="30"
                max="160"
                step="1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
              GRID
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showGuns} onChange={(e) => setShowGuns(e.target.checked)} />
              GUN MODELS
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showMarkers} onChange={(e) => setShowMarkers(e.target.checked)} />
              POINTS
            </label>

            <span className="flex items-center gap-2 ml-auto">
              <span className="inline-block w-2 h-2 rounded-full bg-[#ff3df0]" /> GUN MOUNT
              <span className="inline-block w-2 h-2 rounded-full bg-[#00eaff]" /> MUZZLES
              <span className="inline-block w-2 h-2 rounded-full bg-[#ff7a1a]" /> EXHAUST
            </span>
          </div>

        </div>


        {/* ==================================================
            CONTROLS
            ================================================== */}

        <div className="
          border
          border-white/10
          bg-black/30
          p-3
          space-y-4
        ">

          <div className="space-y-2">
            <PanelTitle>GUNS</PanelTitle>

            <div className="flex flex-wrap gap-1">
              {WEAPON_TYPES.map((t) => (
                <SmallButton
                  key={t}
                  active={weaponType === t}
                  onClick={() => setWeaponType(t)}
                >
                  {t.toUpperCase()}
                </SmallButton>
              ))}
            </div>

            <label className="
              flex
              items-center
              gap-2
              text-[8px]
              tracking-widest
              text-white/45
              cursor-pointer
            ">
              <input
                type="checkbox"
                checked={!!edit.link}
                onChange={(e) => patch((next) => {
                  next.link = e.target.checked
                })}
              />
              EDIT ALL WEAPON TYPES TOGETHER
            </label>

            <NumField label="OFFSET X" value={gun.offsetX ?? 0} onChange={(v) => setGun('offsetX', v)} />
            <NumField label="OFFSET Y (FORWARD)" value={gun.offsetY ?? 0} onChange={(v) => setGun('offsetY', v)} />
            <NumField label="GUN GAP (EACH SIDE)" value={gun.gunGap ?? 0} onChange={(v) => setGun('gunGap', v)} />

          </div>

          <div className="space-y-2">
            <PanelTitle color="text-fuchsia-300/80">GUN MODEL</PanelTitle>

            {gunTypeId ? (
              <>
                <div className="text-[8px] tracking-widest text-white/40">
                  {GUN_TYPES.find((g) => g.id === gunTypeId)?.name ?? gunTypeId}
                </div>

                <NumField label="MOUNT X (EACH SIDE)" value={mount.offsetX} onChange={(v) => setMount('offsetX', v)} />
                <NumField label="MOUNT Y (FORWARD)" value={mount.offsetY} onChange={(v) => setMount('offsetY', v)} />
                <NumField label="GUN SIZE (SCALE)" value={mount.scale} onChange={(v) => setMount('scale', Math.max(0.05, v))} />
              </>
            ) : (
              <div className="text-[8px] tracking-widest text-white/30">THIS SHIP HAS NO GUN MODEL</div>
            )}

            {gunError && (
              <div className="text-[8px] tracking-widest text-red-300/80 normal-case">
                Gun preview failed: {gunError}
              </div>
            )}

            {selectedShip.id === 'player' && (
              <label className="
                flex
                items-center
                justify-between
                gap-2
                text-[8px]
                tracking-widest
                text-white/45
              ">
                PLAYER GUN
                <select
                  value={playerGunId}
                  onChange={(e) => setPlayerGunId(e.target.value)}
                  className="bg-black/60 border border-white/15 text-cyan-300 text-[10px] px-1 py-0.5"
                >
                  {GUN_TYPES.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="space-y-2">
            <PanelTitle color="text-orange-300/80">EXHAUST</PanelTitle>

            <NumField label="ENGINE GAP (EACH SIDE)" value={exhaust.engineGap ?? 0} onChange={(v) => setExhaust('engineGap', v)} />
            <NumField label="NOZZLE OFFSET" value={exhaust.nozzleOffset ?? 0} onChange={(v) => setExhaust('nozzleOffset', v)} />
          </div>

          <div className="space-y-2">
            <label className="
              flex
              items-center
              gap-2
              text-[8px]
              tracking-widest
              text-white/45
              cursor-pointer
            ">
              <input
                type="checkbox"
                checked={applyLive}
                onChange={(e) => setApplyLive(e.target.checked)}
              />
              APPLY TO RUNNING GAME
            </label>

            <div className="flex gap-1">
              <SmallButton onClick={resetShip}>RESET THIS SHIP</SmallButton>
              <SmallButton onClick={resetAll}>RESET ALL</SmallButton>
            </div>
          </div>

        </div>

      </div>


      {/* ====================================================
          SHIP SELECTOR
          ==================================================== */}

      <div className="
        border
        border-white/10
        bg-black/30
        p-3
      ">

        <div className="
          mb-3
          flex
          items-center
          justify-between
        ">
          <div className="text-white/30 text-[8px] tracking-[0.25em]">
            SHIP ASSETS
          </div>

          <div className="text-white/15 text-[7px] tracking-widest">
            {ships.length} UNITS
          </div>
        </div>

        <div className="
          grid
          grid-cols-3
          sm:grid-cols-4
          lg:grid-cols-6
          gap-2
        ">
          {ships.map((ship) => (
            <ShipCard
              key={ship.id}
              name={ship.name}
              label={ship.label}
              src={ship.src}
              selected={selected === ship.id}
              onClick={() => setSelected(ship.id)}
            />
          ))}
        </div>

      </div>


      {/* ====================================================
          EXPORT
          ==================================================== */}

      <div className="
        border
        border-white/10
        bg-black/30
        p-3
        space-y-2
      ">
        <div className="flex items-center justify-between">
          <div className="text-white/30 text-[8px] tracking-[0.25em]">
            EXPORT (ALL SHIPS)
          </div>

          <div className="flex items-center gap-2">
            {copied && (
              <span className="text-[8px] tracking-widest text-green-300/80">{copied}</span>
            )}
            <SmallButton onClick={copyExport}>COPY</SmallButton>
          </div>
        </div>

        <textarea
          id="ship-editor-export"
          readOnly
          value={exportText}
          spellCheck={false}
          className="
            w-full
            h-56
            bg-black/60
            border
            border-white/15
            text-cyan-200/80
            text-[10px]
            leading-snug
            font-mono
            p-2
            tracking-normal
          "
        />

        <p className="text-white/30 text-[8px] tracking-widest normal-case leading-relaxed">
          Reloading the page resets the game's config to what is in bosses.js
          and emission.js. Paste a ship's emission block there to keep a change.
        </p>
      </div>

    </div>
  )
}

// ============================================================
// BOSSES
// ============================================================

function BossInfo({ boss }) {
  if (!boss) return null

  return (
    <div className="
      grid
      grid-cols-2
      gap-x-6
      gap-y-2
      border
      border-white/10
      bg-black/40
      p-3
    ">
      <DebugValue label="KEY" value={boss.key} />
      <DebugValue label="NAME" value={boss.name} />
      <DebugValue
        label="GUN"
        value={boss.gun?.typeId ?? 'NONE'}
      />
      <DebugValue
        label="SHIP"
        value={boss.isShip === false ? 'NO' : 'YES'}
      />
      <DebugValue
        label="HEALTH"
        value={boss.health ?? 'DEFAULT'}
      />
      <DebugValue
        label="HIT RADIUS"
        value={boss.hitRadius ?? 'DEFAULT'}
      />
    </div>
  )
}

function DebugValue({ label, value }) {
  return (
    <div>
      <div className="text-white/30 text-[7px] tracking-[0.2em]">
        {label}
      </div>

      <div className="
        mt-0.5
        text-cyan-300/80
        text-[9px]
        tracking-widest
        truncate
      ">
        {String(value)}
      </div>
    </div>
  )
}

function BossesSection() {
  const [selectedKey, setSelectedKey] = useState(
    BOSSES[0]?.key ?? null
  )

  const boss =
    BOSSES.find((b) => b.key === selectedKey) ?? BOSSES[0]

  const isShipBoss = boss?.isShip !== false
  const svg = BOSS_SVG_BY_KEY[boss?.key]

  return (
    <div className="space-y-4">

      <DebugStage
        height="h-[28rem]"
        camera={[0, 0, 9]}
      >
        {isShipBoss && svg ? (
          <PreviewShip src={svg} />
        ) : (
          <KrakenPreview />
        )}
      </DebugStage>

      <BossInfo boss={boss} />

      <div className="
        grid
        grid-cols-2
        sm:grid-cols-3
        lg:grid-cols-4
        gap-3
      ">
        {BOSSES.map((entry) => {
          const isShip = entry.isShip !== false
          const src = BOSS_SVG_BY_KEY[entry.key]

          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setSelectedKey(entry.key)}
              className={`
                border
                p-2
                text-left
                cursor-pointer
                transition-all

                ${selectedKey === entry.key
                  ? `
                    border-cyan-300
                    bg-cyan-400/10
                  `
                  : `
                    border-white/10
                    bg-black/40
                    hover:border-cyan-300/50
                  `
                }
              `}
            >
              <div className="
                h-24
                flex
                items-center
                justify-center
                border
                border-white/10
                bg-black/60
              ">
                {isShip && src ? (
                  <img
                    src={src}
                    alt={entry.name}
                    className="max-w-[88%] max-h-[88%] object-contain"
                  />
                ) : (
                  <div className="
                    text-red-300
                    text-[10px]
                    tracking-[0.25em]
                  ">
                    KRAKEN
                  </div>
                )}
              </div>

              <div className="
                mt-2
                text-cyan-300
                text-[9px]
                tracking-widest
                truncate
              ">
                {entry.name}
              </div>

              <div className="
                mt-1
                text-white/30
                text-[7px]
                tracking-widest
              ">
                {entry.key}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}


// ============================================================
// KRAKEN DEBUG VISUAL
// ============================================================

function KrakenPreview() {
  const groupRef = useRef()

  useFrame((state) => {
    if (!groupRef.current) return

    groupRef.current.rotation.z =
      Math.sin(state.clock.elapsedTime * 0.5) * 0.08

    groupRef.current.scale.setScalar(
      1 + Math.sin(state.clock.elapsedTime * 2) * 0.025
    )
  })

  const tentacles = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 8

    return (
      <mesh
        key={i}
        position={[
          Math.cos(angle) * 0.65,
          Math.sin(angle) * 0.65,
          0,
        ]}
        rotation={[0, 0, angle]}
      >
        <capsuleGeometry args={[0.18, 1.15, 8, 16]} />

        <meshBasicMaterial
          color="#4b2d8a"
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
    )
  })

  return (
    <group ref={groupRef}>
      {tentacles}

      <mesh>
        <sphereGeometry args={[0.95, 32, 32]} />
        <meshBasicMaterial
          color="#713cff"
          toneMapped={false}
        />
      </mesh>

      <mesh scale={0.35}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color="#ff4fdb"
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}


// ============================================================
// EFFECT PREVIEW MATERIAL
// ============================================================

function GlowPlane({
  color = '#00eaff',
  scale = [1, 1, 1],
  opacity = 1,
}) {
  return (
    <mesh scale={scale}>
      <planeGeometry args={[1, 1]} />

      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}


// ============================================================
// EXHAUST EFFECT
// ============================================================

function ExhaustEffect({
  color = '#00eaff',
}) {
  const groupRef = useRef()

  const particles = useMemo(() => (
    Array.from({ length: 35 }, (_, i) => ({
      x: (Math.random() - 0.5) * 0.7,
      y: -i * 0.045,
      size: 0.08 + Math.random() * 0.16,
      phase: Math.random() * Math.PI * 2,
      speed: 0.7 + Math.random() * 1.8,
    }))
  ), [])

  useFrame((state) => {
    if (!groupRef.current) return

    groupRef.current.children.forEach((child, i) => {
      const p = particles[i]

      child.position.x =
        p.x +
        Math.sin(
          state.clock.elapsedTime * p.speed + p.phase
        ) * 0.06

      child.position.y =
        -(
          (
            state.clock.elapsedTime * p.speed * 0.7 +
            i * 0.11
          ) % 2.0
        )

      const life =
        1 -
        Math.abs(child.position.y) / 2.0

      child.material.opacity =
        Math.max(0, life) * 0.75
    })
  })

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <GlowPlane
          key={i}
          color={color}
          scale={[
            p.size,
            p.size * 1.8,
            1,
          ]}
          opacity={0.7}
        />
      ))}
    </group>
  )
}


// ============================================================
// ENERGY BEAM
// ============================================================

function BeamEffect() {
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return

    const pulse =
      1 +
      Math.sin(state.clock.elapsedTime * 12) * 0.12

    ref.current.scale.x = pulse
  })

  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh ref={ref}>
        <planeGeometry args={[0.18, 4]} />

        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <planeGeometry args={[0.05, 4.2]} />

        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}


// ============================================================
// EXPLOSION EFFECT
// ============================================================

function ExplosionEffect() {
  const groupRef = useRef()

  const particles = useMemo(() => (
    Array.from({ length: 28 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.8,
      size: 0.04 + Math.random() * 0.12,
    }))
  ), [])

  useFrame((state) => {
    if (!groupRef.current) return

    const time =
      state.clock.elapsedTime % 2.2

    groupRef.current.children.forEach((child, i) => {
      const p = particles[i]

      const distance =
        time * p.speed

      child.position.x =
        Math.cos(p.angle) * distance

      child.position.y =
        Math.sin(p.angle) * distance

      const life =
        Math.max(
          0,
          1 - time / 2.2
        )

      child.scale.setScalar(
        p.size * (1 + time * 0.8)
      )

      child.material.opacity =
        life
    })
  })

  return (
    <group ref={groupRef}>
      {particles.map((_, i) => (
        <GlowPlane
          key={i}
          color="#ff6a00"
          opacity={1}
        />
      ))}

      <GlowPlane
        color="#ffffaa"
        scale={[0.5, 0.5, 1]}
        opacity={0.9}
      />
    </group>
  )
}


// ============================================================
// EFFECT CARD
// ============================================================

function EffectCard({
  name,
  description,
  children,
}) {
  return (
    <div className="
      border
      border-white/10
      bg-black/40
      overflow-hidden
    ">
      <div className="
        h-40
        border-b
        border-white/10
        bg-black/70
      ">
        <Canvas
          camera={{
            position: [0, 0, 5],
            fov: 50,
          }}
          gl={{
            antialias: true,
            alpha: true,
          }}
        >
          <ambientLight intensity={0.5} />
          {children}
        </Canvas>
      </div>

      <div className="p-3">
        <div className="
          text-cyan-300
          text-[10px]
          tracking-[0.2em]
        ">
          {name}
        </div>

        <div className="
          mt-1
          text-white/35
          text-[8px]
          tracking-widest
        ">
          {description}
        </div>
      </div>
    </div>
  )
}


// ============================================================
// EFFECTS
// ============================================================

function EffectsSection() {
  return (
    <div className="
      grid
      grid-cols-1
      md:grid-cols-2
      gap-4
    ">

      <EffectCard
        name="EXHAUST"
        description="ENGINE / THRUSTER PARTICLES"
      >
        <ExhaustEffect color="#00eaff" />
      </EffectCard>

      <EffectCard
        name="FIRE EXHAUST"
        description="HOT ENGINE PLUME"
      >
        <ExhaustEffect color="#ff5a00" />
      </EffectCard>

      <EffectCard
        name="ENERGY BEAM"
        description="LASER / BEAM PREVIEW"
      >
        <BeamEffect />
      </EffectCard>

      <EffectCard
        name="EXPLOSION"
        description="BOSS DEATH / IMPACT"
      >
        <ExplosionEffect />
      </EffectCard>

    </div>
  )
}


// ============================================================
// GUNS
// ============================================================

function GunsSection() {
  return (
    <div
      className="
        grid
        grid-cols-2
        sm:grid-cols-3
        lg:grid-cols-4
        gap-3
      "
    >
      {GUN_TYPES.map((gun) => (
        <div
          key={gun.id}
          className="
            border
            border-white/10
            bg-black/40
            p-2
          "
        >
          <div
            className="
              h-20
              flex
              items-center
              justify-center
              border
              border-white/10
              bg-black/50
              mb-2
            "
          >
            <img
              src={gun.svg}
              alt={gun.name}
              className="
                max-w-[80%]
                max-h-[80%]
                object-contain
              "
            />
          </div>

          <div className="
            text-cyan-300/90
            text-[10px]
            tracking-widest
            truncate
          ">
            {gun.name}
          </div>

          <div className="
            text-white/40
            text-[8px]
            tracking-widest
            truncate
          ">
            id: {gun.id}
          </div>

          <div className="
            text-white/40
            text-[8px]
            tracking-widest
            truncate
          ">
            weaponId: {gun.weaponId}
          </div>
        </div>
      ))}
    </div>
  )
}


// ============================================================
// SPRITES
// ============================================================

const SPRITE_CHECKS = [
  // Add additional non-gun assets here.
  //
  // {
  //   label: 'Example',
  //   src: '/sprites/example.svg',
  // },
]

function SpritesSection() {
  if (SPRITE_CHECKS.length === 0) {
    return (
      <p className="
        text-white/40
        text-[10px]
        tracking-widest
      ">
        No sprites registered.
      </p>
    )
  }

  return (
    <div className="
      grid
      grid-cols-3
      sm:grid-cols-4
      gap-3
    ">
      {SPRITE_CHECKS.map((s) => (
        <div
          key={s.label}
          className="
            border
            border-white/10
            bg-black/40
            p-2
          "
        >
          <div className="
            h-20
            flex
            items-center
            justify-center
            border
            border-white/10
            bg-black/50
            mb-2
          ">
            <img
              src={s.src}
              alt={s.label}
              className="
                max-w-[80%]
                max-h-[80%]
                object-contain
              "
            />
          </div>

          <div className="
            text-cyan-300/90
            text-[10px]
            tracking-widest
            truncate
          ">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}


// ============================================================
// SECTION REGISTRY
// ============================================================

const SECTION_RENDERERS = {
  ships: ShipsSection,
  bosses: BossesSection,
  effects: EffectsSection,
  guns: GunsSection,
  sprites: SpritesSection,
}


// ============================================================
// SCREEN
// ============================================================

export function DebugScreen({ onBack }) {
  const [activeSection, setActiveSection] = useState('ships')

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
      return
    }

    useGameStore.setState({
      screen: SCREEN.MENU,
    })
  }, [onBack])

  useEffect(() => {
    const onKey = (e) => {
      if (
        e.key === 'Escape' ||
        e.key === 'Backspace'
      ) {
        e.preventDefault()
        handleBack()
      }
    }

    window.addEventListener(
      'keydown',
      onKey
    )

    return () => {
      window.removeEventListener(
        'keydown',
        onKey
      )
    }
  }, [handleBack])

  const ActiveComponent =
    SECTION_RENDERERS[activeSection]

  return (
    <FlightLayout2
      title="DEBUG"
      footer="INTERNAL USE ONLY"
      size="2xl"
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

        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-[160px_minmax(0,1fr)]
            gap-3
            lg:gap-3
          "
        >

          {/* ==================================================
              NAV
          ================================================== */}

          <section>

            <div className="
              mb-3
              text-[#39ff14]/60
              tracking-[0.25em]
            ">
              SECTIONS
            </div>

            <div className="
              flex
              flex-col
              gap-2
            ">

              {SECTIONS.map((s) => {
                const active =
                  activeSection === s.id

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setActiveSection(s.id)
                    }
                    className={`
                      cursor-pointer
                      text-left
                      py-2
                      px-3
                      border
                      transition-all
                      duration-200
                      tracking-[0.3em]
                      text-[10px]

                      ${active
                        ? `
                          border-green-300
                          text-cyan-300
                          bg-cyan-500/10
                          shadow-[0_0_18px_rgba(0,255,255,0.35)]
                        `
                        : `
                          border-[#39ff14]/40
                          text-[#39ff14]/70
                          bg-black/40
                          hover:border-cyan-300/70
                        `
                      }
                    `}
                  >
                    {s.label}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={handleBack}
                className="
                  mt-4
                  cursor-pointer
                  text-left
                  py-2
                  px-3
                  border
                  border-red-400/40
                  text-red-300/80
                  bg-black/40
                  tracking-[0.3em]
                  text-[10px]
                  hover:border-red-300/70
                "
              >
                ← BACK
              </button>

            </div>

          </section>


          {/* ==================================================
              CONTENT
          ================================================== */}

          <section>

            <div className="
              mb-3
              flex
              items-center
              justify-between
            ">
              <div className="
                text-[#39ff14]/60
                tracking-[0.25em]
              ">
                {SECTIONS.find(
                  (s) =>
                    s.id === activeSection
                )?.label}
              </div>

              <div className="
                text-white/20
                text-[8px]
                tracking-widest
              ">
                VISUAL DEBUG MODE
              </div>
            </div>

            {ActiveComponent && (
              <ActiveComponent />
            )}

          </section>

        </div>
      </div>
    </FlightLayout2>
  )
}

export default DebugScreen