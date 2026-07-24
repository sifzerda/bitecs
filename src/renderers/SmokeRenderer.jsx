// src/renderers/SmokeRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { smokePool, updateSmokeEmitter } from '../fx/gpu/SmokeEmitter'

const MAX_SMOKE = smokePool.capacity

// ---------------------------------------------------------------------------
// shaders
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aAge;
  varying float vAlpha;
  varying float vAge;
  uniform float uSizeMultiplier;

  void main() {
    vAlpha = aAlpha;
    vAge = aAge;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uSizeMultiplier * mix(1.0, 1.6, aAge) * (60.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying float vAge;
  uniform vec3 uHotCore;
  uniform vec3 uFireColor;
  uniform vec3 uSmokeColor;
  uniform float uOpacity;

  void main() {
    if (vAlpha <= 0.0) discard;

    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float falloff = smoothstep(0.5, 0.0, d);

    vec3 color = mix(uHotCore, uFireColor, smoothstep(0.0, 0.15, vAge));
    color = mix(color, uSmokeColor, smoothstep(0.15, 1.0, vAge));

    gl_FragColor = vec4(color, falloff * vAlpha * uOpacity);
  }
`

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------
//
// Binds directly to smokePool's typed arrays — no per-frame copying.
// Position/scale/alpha come from the factory's standard GPU fields
// (instancePosition / instanceScale / instanceAlpha, same as sparkPool).
// Age comes from the plain `age` scalar field (SmokeEmitter's scalarFields
// list) since the factory has no instanceAge — this pool has no per-instance
// color use yet, so instanceColor is left unbound here.

export function SmokeRenderer({
  hotCore = '#ff2614',
  fireColor = '#8a1f52',
  smokeColor = '#0a1a4a',
  baseOpacity = 0.6,
  sizeMultiplier = 4,
}) {

  const pointsRef = useRef()

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    geo.setAttribute('position', new THREE.BufferAttribute(smokePool.instancePosition, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(smokePool.instanceScale, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(smokePool.instanceAlpha, 1))
    geo.setAttribute('aAge', new THREE.BufferAttribute(smokePool.age, 1))

    return geo
  }, [])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uHotCore: { value: new THREE.Color(hotCore) },
      uFireColor: { value: new THREE.Color(fireColor) },
      uSmokeColor: { value: new THREE.Color(smokeColor) },
      uOpacity: { value: baseOpacity },
      uSizeMultiplier: { value: sizeMultiplier },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), [hotCore, fireColor, smokeColor, baseOpacity, sizeMultiplier])

  useFrame((_, dt) => {

    updateSmokeEmitter(dt)

    if (!smokePool.dirty) return

    const attributes = geometry.attributes

    attributes.position.needsUpdate = true
    attributes.aSize.needsUpdate = true
    attributes.aAlpha.needsUpdate = true
    attributes.aAge.needsUpdate = true

    smokePool.dirty = false

  })

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  )
}