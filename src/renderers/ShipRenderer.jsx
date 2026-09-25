// src/renderers/ShipRenderer.jsx

import { useRef, useState, useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../ecs/constants/world.js'
import { playerQuery, bossQuery } from '../ecs/constants/queries.js'
import { Position, Rotation, BossType, Invulnerability } from '../ecs/constants/components.js'
import { BOSSES } from '../ecs/constants/bosses.js'
import { RENDER_ORDER } from './WeaponMount.jsx'

/* ============================================================
   ASSETS
   ============================================================ */

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

const FALLBACK_BOSS_SVG = BOSS_SVG_BY_KEY.shotgun

/* ============================================================
   SIZE
   ============================================================ */

const PX_TO_WORLD = 1 / 35
const PLAYER_SIZE = 80 * PX_TO_WORLD
const BOSS_SIZE = 80 * PX_TO_WORLD

/* ============================================================
   SHARED SVG ELEMENT
   ============================================================ */

function ShipImage({ src, size }) {
    const texture = useTexture(src)

    useEffect(() => {
        if (texture.__configured) return
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8
        texture.needsUpdate = true
        texture.__configured = true
    }, [texture])

    return (
        <mesh renderOrder={RENDER_ORDER.ship}>
            <planeGeometry args={[size, size]} />
            <meshBasicMaterial
                map={texture}
                transparent
                alphaTest={0.05}
                side={THREE.DoubleSide}
                toneMapped={false}
            />
        </mesh>
    )
}

/* ============================================================
   PLAYER
   ============================================================ */

export function PlayerRenderer() {
    const groupRef = useRef(null)

    const [hasPlayer, setHasPlayer] = useState(false)
    const hasPlayerRef = useRef(false)

    useFrame((state) => {
        const group = groupRef.current

        if (!group) return

        const players = playerQuery(world)

        if (!players.length) {
            group.visible = false

            if (hasPlayerRef.current) {
                hasPlayerRef.current = false
                setHasPlayer(false)
            }

            return
        }

        const eid = players[0]

        const x = Position.x?.[eid]
        const y = Position.y?.[eid]

        if (x === undefined || y === undefined) {
            group.visible = false
            return
        }

        // ----------------------------------------------------
        // Position
        // ----------------------------------------------------
        group.position.set(x, y, 0)
        // ----------------------------------------------------
        // Rotation
        // ----------------------------------------------------
        const angle = Rotation.angle?.[eid] ?? Rotation?.[eid] ?? 0
        group.rotation.z = angle
        // ----------------------------------------------------
        // Invulnerability flashing
        //
        // PLAYER ONLY
        // ----------------------------------------------------
        const invulnerable = (Invulnerability?.remaining?.[eid] ?? 0) > 0

        if (invulnerable) {
            // ~10 flashes per second
            group.visible = Math.floor(state.clock.elapsedTime * 10) % 2 === 0
        } else {
            group.visible = true
        }

        // ----------------------------------------------------
        // Player exists
        // ----------------------------------------------------

        if (!hasPlayerRef.current) {
            hasPlayerRef.current = true
            setHasPlayer(true)
        }
    })

    return (
        <group ref={groupRef}>
            {hasPlayer && (
                <>
                    <ShipImage src={PLAYER_SVG} size={PLAYER_SIZE} />
                    
                </>
            )}
        </group>
    )
}

/* ============================================================
   BOSS TYPE
   ============================================================ */

function getBossTypeIndex(eid) {

    if (BossType?.typeIndex?.[eid] !== undefined) {
        return BossType.typeIndex[eid]
    }
    if (BossType?.[eid] !== undefined) {
        return BossType[eid]
    }
    return 0
}

function getBossCfg(eid) {
    const typeIndex = getBossTypeIndex(eid)
    return BOSSES[typeIndex] ?? null
}

function getBossSvgSrc(bossCfg) {
    if (!bossCfg) return FALLBACK_BOSS_SVG
    return BOSS_SVG_BY_KEY[bossCfg.key] ?? FALLBACK_BOSS_SVG
}

/* ============================================================
   BOSS RENDERER
   ============================================================ */

export function BossRenderer() {
    const groupRef = useRef(null)

    const [hasBoss, setHasBoss] = useState(false)
    const hasBossRef = useRef(false)

    const [svgSrc, setSvgSrc] = useState(FALLBACK_BOSS_SVG)
    const [bossCfg, setBossCfg] = useState(null)
    const lastEidRef = useRef(null)
    const lastTypeRef = useRef(null)

    useFrame(() => {
        const group = groupRef.current
        if (!group) return
        const bosses = bossQuery(world)
        const eid = bosses[0]

        /* ----------------------------------------------------
        No boss
        ---------------------------------------------------- */

        if (eid === undefined) {
            group.visible = false
            lastEidRef.current = null
            lastTypeRef.current = null

            if (hasBossRef.current) {
                hasBossRef.current = false
                setHasBoss(false)
            }
            return
        }

        /* ----------------------------------------------------
        Position
        ---------------------------------------------------- */

        const x = Position.x?.[eid]
        const y = Position.y?.[eid]

        if (x === undefined || y === undefined) {
            group.visible = false
            return
        }

        group.visible = true
        group.position.set(x, y, 0.15)
        /* ----------------------------------------------------
        Rotation
        ---------------------------------------------------- */
        const angle = Rotation.angle?.[eid] ?? Rotation?.[eid] ?? 0
        group.rotation.z = angle
        /* ----------------------------------------------------
        Boss Type
        ---------------------------------------------------- */

        const typeIndex = getBossTypeIndex(eid)

        if (lastEidRef.current !== eid || lastTypeRef.current !== typeIndex) {
            lastEidRef.current = eid
            lastTypeRef.current = typeIndex
            const cfg = getBossCfg(eid)
            setBossCfg(cfg)
            setSvgSrc(getBossSvgSrc(cfg))
        }

        if (!hasBossRef.current) {
            hasBossRef.current = true
            setHasBoss(true)
        }
    })

    // The octopus (and any future non-ship boss) has no hull/cockpit/
    // propellers to draw here — its entire visual comes from
    // OctopusRenderer.jsx, which tracks this same entity's Position
    // independently. Ship-only visuals stay behind this guard.
    const isShipBoss = bossCfg?.isShip !== false

    return (
        <group ref={groupRef} visible={false}>
            {hasBoss && isShipBoss && (
                <>
                    <ShipImage src={svgSrc} size={BOSS_SIZE} />
                </>
            )}
        </group>
    )
}