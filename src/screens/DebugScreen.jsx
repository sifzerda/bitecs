// src/screens/DebugScreen.jsx

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import FlightLayout2 from '../components/FlightLayout2.jsx'
import { useGameStore, SCREEN } from '../../store/gameStore.js'
import { GUN_TYPES } from '../ecs/weapons/config/gunConfigs.js'
import { BOSSES } from '../ecs/constants/bosses.js'

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

function DebugStage({
  children,
  height = 'h-96',
  camera = [0, 0, 6],
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
        camera={{
          position: camera,
          fov: 50,
        }}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
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
// ============================================================

function PreviewShip({
  src,
  size = 3,
  rotation = 0,
  glow = true,
}) {
  const texture = useTexture(src)
  const groupRef = useRef()

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  useFrame((state) => {
    if (!groupRef.current) return

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
          <planeGeometry args={[size * 0.72, size * 0.72]} />
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
        <planeGeometry args={[size, size]} />
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
// SHIPS
// ============================================================

function ShipsSection() {
  const [selected, setSelected] = useState('player')

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

  return (
    <div className="space-y-4">

      <div className="
        grid
        grid-cols-1
        lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]
        gap-4
      ">

        {/* ==================================================
            LARGE PREVIEW
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
          ">
            <div>
              <div className="
                text-cyan-300
                text-[9px]
                tracking-[0.25em]
              ">
                SELECTED SHIP
              </div>

              <div className="
                mt-1
                text-white/25
                text-[7px]
                tracking-widest
              ">
                {selectedShip?.label}
              </div>
            </div>

            <div className="
              text-white/20
              text-[7px]
              tracking-widest
            ">
              LIVE PREVIEW
            </div>
          </div>

          <DebugStage
            height="h-[24rem]"
            camera={[0, 0, 6]}
          >
            {selectedShip?.src && (
              <PreviewShip
                src={selectedShip.src}
                size={3.2}
              />
            )}
          </DebugStage>

          <div className="
            px-3
            py-2
            border-t
            border-white/10
            bg-black/40
          ">
            <div className="
              text-cyan-300
              text-[10px]
              tracking-[0.18em]
              truncate
            ">
              {selectedShip?.name}
            </div>

            <div className="
              mt-1
              text-white/25
              text-[7px]
              tracking-widest
            ">
              {selectedShip?.id}
            </div>
          </div>

        </div>


        {/* ==================================================
            COMPACT SHIP SELECTOR
            ================================================== */}

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
            <div className="
              text-white/30
              text-[8px]
              tracking-[0.25em]
            ">
              SHIP ASSETS
            </div>

            <div className="
              text-white/15
              text-[7px]
              tracking-widest
            ">
              {ships.length} UNITS
            </div>
          </div>

          <div className="
            grid
            grid-cols-2
            sm:grid-cols-3
            lg:grid-cols-2
            xl:grid-cols-3
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
        camera={[0, 0, 6]}
      >
        {isShipBoss && svg ? (
          <PreviewShip
            src={svg}
            size={2.6}
          />
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
 