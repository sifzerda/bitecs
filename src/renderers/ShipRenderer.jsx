// src/renderers/ShipRenderer.jsx

import { useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

import { world } from '../ecs/constants/world.js'
import { playerQuery, bossQuery } from '../ecs/constants/queries.js'
import {
    Position,
    Rotation,
    BossType,
} from '../ecs/constants/components.js'
import { BOSSES } from '../ecs/constants/bosses.js'

/* ============================================================
   ASSETS
   ============================================================ */

const PLAYER_SVG = '/ship_svgs/00_player.svg'

// Keyed by boss.key (from bosses.js) rather than raw array index —
// BOSSES itself contains a "player" entry at index 0, so BossType's
// typeIndex (which comes straight from BOSS_INDEX_BY_KEY, an index
// into the FULL BOSSES array) does not line up 1:1 with this
// boss-only list. Looking up by key sidesteps that mismatch entirely
// and stays correct even if bosses.js is reordered later.
const BOSS_SVG_BY_KEY = {
    shotgun: '/ship_svgs/01_shotgunboss.svg',
    machinegun: '/ship_svgs/02_machinegunboss.svg',
    cryogun: '/ship_svgs/03_cryogunboss.svg',
    grenadegun: '/ship_svgs/04_grenadelauncherboss.svg',
    acidthrowergun: '/ship_svgs/05_acidthrowerboss.svg',
    missilegun: '/ship_svgs/06_missilelaunchergunboss.svg',
    flamethrowergun: '/ship_svgs/07_flamethrowerboss.svg',
    lasergun: '/ship_svgs/08_lasergunboss.svg',
    arcgun: '/ship_svgs/09_arcgunboss.svg',
    plasmagun: '/ship_svgs/10_plasmagunboss.svg',
}

const FALLBACK_BOSS_SVG = BOSS_SVG_BY_KEY.shotgun

/* ============================================================
   SIZE
   ============================================================ */

const PLAYER_SIZE = 220
const BOSS_SIZE = 220

/* ============================================================
   SHARED SVG ELEMENT
   ============================================================ */

function ShipImage({ src, size }) {
    return (
        <Html
            transform
            center
            sprite={false}
            style={{
                pointerEvents: 'none',
                width: `${size}px`,
                height: `${size}px`,
                overflow: 'visible',
            }}
        >
            <img
                src={src}
                alt=""
                draggable={false}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            />
        </Html>
    )
}

/* ============================================================
   PLAYER
   ============================================================ */

export function PlayerRenderer() {
    const groupRef = useRef(null)

    // Mirrors the same "don't mount the DOM node until real data exists"
    // guard used in BossRenderer below — drei's <Html> is a DOM portal,
    // not a normal mesh, so toggling the parent group's `visible` alone
    // isn't reliable for hiding it. Harmless here in practice (the
    // player usually exists immediately), but kept consistent so a
    // stray static ship can never flash at the origin before spawn.
    const [hasPlayer, setHasPlayer] = useState(false)
    const hasPlayerRef = useRef(false)

    useFrame(() => {
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

        group.visible = true
        group.position.set(x, y, 0)
        const angle = Rotation.angle?.[eid] ?? Rotation?.[eid] ?? 0
        group.rotation.z = angle

        if (!hasPlayerRef.current) {
            hasPlayerRef.current = true
            setHasPlayer(true)
        }
    })

    return (
        <group ref={groupRef}>
            {hasPlayer && (
                <ShipImage
                    src={PLAYER_SVG}
                    size={PLAYER_SIZE}
                />
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

function getBossSvgSrc(eid) {
    const typeIndex = getBossTypeIndex(eid)
    const bossCfg = BOSSES[typeIndex]
    if (!bossCfg) return FALLBACK_BOSS_SVG
    return BOSS_SVG_BY_KEY[bossCfg.key] ?? FALLBACK_BOSS_SVG
}

/* ============================================================
   BOSS RENDERER
   ============================================================ */

export function BossRenderer() {
    const groupRef = useRef(null)

    // hasBoss gates whether <ShipImage>'s <Html> DOM node is mounted
    // at all. Previously the component always rendered <ShipImage>,
    // relying on `group.visible = false` to hide it — but drei's Html
    // portals a real DOM <img> outside the Three.js scene graph, and
    // does not reliably respect the parent Object3D's `visible` flag.
    // That meant the image existed and sat at the default transform
    // (world origin, BOSS_SVGS[0]'s src) from the moment this component
    // mounted — appearing as a "frozen boss" from wave 1 / game start,
    // long before any real boss entity existed. It would only start
    // moving once a genuine boss spawned and useFrame began driving
    // that same stray DOM node's position/rotation for real.
    const [hasBoss, setHasBoss] = useState(false)
    const hasBossRef = useRef(false)

    const [svgSrc, setSvgSrc] = useState(FALLBACK_BOSS_SVG)
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
            setSvgSrc(getBossSvgSrc(eid))
        }

        if (!hasBossRef.current) {
            hasBossRef.current = true
            setHasBoss(true)
        }
    })

    return (
        <group ref={groupRef} visible={false}>
            {hasBoss && <ShipImage src={svgSrc} size={BOSS_SIZE} />}
        </group>
    )
}