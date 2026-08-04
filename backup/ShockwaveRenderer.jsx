// src/renderers/ShockwaveRenderer.jsx

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { shockwavePool, updateShockwaveEmitter } from "../fx/gpu/ShockwaveEmitter"

const MAX = shockwavePool.capacity

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _scale = new THREE.Vector3(1, 1, 1)
const _rotation = new THREE.Quaternion()

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

    const meshRef = useRef()
    const alphaBuffer = useMemo(() => new Float32Array(MAX), [])

    const geometry = useMemo(() => {
        const geo = new THREE.RingGeometry(0.8, 1, 32)
        geo.setAttribute("instanceAlpha", new THREE.InstancedBufferAttribute(alphaBuffer, 1))
        return geo
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
        blending: THREE.AdditiveBlending,
    }), [color, baseOpacity])

    useFrame((_, dt) => {

        updateShockwaveEmitter(dt)

        const mesh = meshRef.current

        if (!mesh)
            return

        const p = shockwavePool

        let count = 0

        for (let n = 0; n < p.activeCount; n++) {
            const id = p.activeIds[n]
            const pos = id * 3
            _position.set(p.instancePosition[pos], p.instancePosition[pos + 1], p.instancePosition[pos + 2])

            const radius = p.instanceScale[id]
            _scale.set(radius, radius, 1)
            _matrix.compose(_position, _rotation, _scale)
            mesh.setMatrixAt(count, _matrix)

            alphaBuffer[count] = p.instanceAlpha[id]
            count++
        }

        mesh.count = count

        if (count === 0)
            return

        if (p.dirty) {

            mesh.instanceMatrix.needsUpdate = true
            geometry.attributes.instanceAlpha.needsUpdate = true

            p.dirty = false
        }

    })

    return (
        <instancedMesh ref={meshRef} args={[geometry, material, MAX]} frustumCulled={false} />
    )

}