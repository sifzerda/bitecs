// src/renderers/BossRenderer.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import { bossQuery } from "../ecs/constants/queries.js"
import { world } from "../ecs/constants/world.js"
import { Position, Health } from "../ecs/constants/components.js"

const MAX_BOSSES = 4
const BAR_WIDTH = 3.0
const BAR_HEIGHT = 0.2
const BAR_OFFSET = 2.2

// ------------------------------------------------------
// Scratch objects
// ------------------------------------------------------

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _scaleZero = new THREE.Vector3(0, 0, 0)

const _barMatrix = new THREE.Matrix4()
const _barPosition = new THREE.Vector3()
const _barRotation = new THREE.Quaternion()
const _barScale = new THREE.Vector3()

export function BossRenderer() {

    const bodyRef = useRef()
    const bgBarRef = useRef()
    const fgBarRef = useRef()

    const meshGeo = useMemo(() => new THREE.IcosahedronGeometry(1.5, 0), [])

    useFrame(() => {

        const body = bodyRef.current
        const bgBar = bgBarRef.current
        const fgBar = fgBarRef.current

        if (!body || !bgBar || !fgBar) return

        const bosses = bossQuery(world)

        // -------------------------
        // Body
        // -------------------------

        for (let i = 0; i < bosses.length; i++) {

            const eid = bosses[i]

            _position.set(Position.x[eid], Position.y[eid], 0)
            _scale.setScalar(1)
            _matrix.compose(_position, _rotation, _scale)
            body.setMatrixAt(i, _matrix)
        }

        for (let i = bosses.length; i < MAX_BOSSES; i++) {
            _position.set(0, 0, 0)
            _matrix.compose(_position, _rotation, _scaleZero)
            body.setMatrixAt(i, _matrix)
        }

        body.instanceMatrix.needsUpdate = true
        body.count = MAX_BOSSES

        // -------------------------
        // Health bar background
        // -------------------------

        for (let i = 0; i < bosses.length; i++) {

            const eid = bosses[i]

            _barPosition.set(Position.x[eid], Position.y[eid] + BAR_OFFSET, 0)
            _barScale.set(BAR_WIDTH, BAR_HEIGHT, 1)
            _barMatrix.compose(_barPosition, _barRotation, _barScale)
            bgBar.setMatrixAt(i, _barMatrix)
        }

        for (let i = bosses.length; i < MAX_BOSSES; i++) {
            _barPosition.set(0, 0, 0)
            _barMatrix.compose(_barPosition, _barRotation, _scaleZero)
            bgBar.setMatrixAt(i, _barMatrix)
        }

        bgBar.instanceMatrix.needsUpdate = true
        bgBar.count = MAX_BOSSES

        // -------------------------
        // Health bar fill
        // -------------------------

        for (let i = 0; i < bosses.length; i++) {

            const eid = bosses[i]

            const pct = Math.max(0, Health.current[eid] / Health.max[eid])
            const fillWidth = BAR_WIDTH * pct
            const offsetX = (BAR_WIDTH - fillWidth) * 0.5

            _barPosition.set(Position.x[eid] - offsetX, Position.y[eid] + BAR_OFFSET, 0.01)
            _barScale.set(fillWidth, BAR_HEIGHT, 1)
            _barMatrix.compose(_barPosition, _barRotation, _barScale)
            fgBar.setMatrixAt(i, _barMatrix)
        }

        for (let i = bosses.length; i < MAX_BOSSES; i++) {
            _barPosition.set(0, 0, 0)
            _barMatrix.compose(_barPosition, _barRotation, _scaleZero)
            fgBar.setMatrixAt(i, _barMatrix)
        }

        fgBar.instanceMatrix.needsUpdate = true
        fgBar.count = MAX_BOSSES

    })

    return (
        <>
            {/* Body */}
            <instancedMesh
                ref={bodyRef}
                args={[null, null, MAX_BOSSES]}
                frustumCulled={false}>
                <primitive object={meshGeo} attach="geometry" />
                <meshStandardMaterial
                    color="#ff3355"
                    emissive="#440011"
                    roughness={0.3}
                    metalness={0.8}
                />
            </instancedMesh>

            {/* Health bar background */}
            <instancedMesh
                ref={bgBarRef}
                args={[null, null, MAX_BOSSES]}
                frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="red" />
            </instancedMesh>

            {/* Health bar fill */}
            <instancedMesh
                ref={fgBarRef}
                args={[null, null, MAX_BOSSES]}
                frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#44ff88" />
            </instancedMesh>
        </>
    )
}