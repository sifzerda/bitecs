// src/renderers/ShockwaveRenderer.jsx

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { shockwavePool, updateShockwaveEmitter } from "../fx/gpu/ShockwaveEmitter"

const MAX = shockwavePool.capacity

const _matrix = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _scale = new THREE.Vector3()
const _rot = new THREE.Quaternion()

const vertexShader = /* glsl */ `
  attribute float instanceAlpha;
  varying float vAlpha;

  void main() {
    vAlpha = instanceAlpha;
    vec4 mvPosition = instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    if (vAlpha <= 0.0) discard;
    gl_FragColor = vec4(uColor, vAlpha * uOpacity);
  }
`

export function ShockwaveRenderer({ color = "#88ddff", baseOpacity = 0.3 }) {

    const ref = useRef()

    // local, compacted-index buffer — NOT a direct reference to the pool's
    // raw (slot-id-indexed) array, since InstancedMesh instances are
    // compacted (dead slots skipped) and must line up with setMatrixAt's count
    const alphaBuffer = useMemo(() => new Float32Array(MAX), [])

    const geo = useMemo(() => {
        const g = new THREE.RingGeometry(0.8, 1, 32)
        g.setAttribute("instanceAlpha", new THREE.InstancedBufferAttribute(alphaBuffer, 1))
        return g
    }, [])

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: baseOpacity },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
    }), [color, baseOpacity])

    useFrame((_, dt) => {

        updateShockwaveEmitter(dt)

        const p = shockwavePool
        const mesh = ref.current
        if (!mesh) return

        let count = 0

        for (let i = 0; i < p.capacity; i++) {

            if (!p.alive[i])
                continue

            const pos = i * 3

            _pos.set(p.instancePosition[pos], p.instancePosition[pos + 1], p.instancePosition[pos + 2])
            _scale.set(p.instanceScale[i], p.instanceScale[i], 1)
            _matrix.compose(_pos, _rot, _scale)
            mesh.setMatrixAt(count, _matrix)

            alphaBuffer[count] = p.instanceAlpha[i]

            count++

        }

        mesh.count = count
        mesh.instanceMatrix.needsUpdate = true
        mesh.geometry.attributes.instanceAlpha.needsUpdate = true

    })

    return (
        <instancedMesh ref={ref} args={[geo, material, MAX]} frustumCulled={false} />
    )

}