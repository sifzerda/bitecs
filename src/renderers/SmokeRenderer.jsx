// src/renderers/SmokeRenderer.jsx

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { smokePool, smokeSize } from '../fx/gpu/SmokeEmitter'

const MAX_SMOKE = smokePool.capacity

// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aAge;
  varying float vAlpha;
  varying float vAge;

  void main() {
    vAlpha = aAlpha;
    vAge = aAge;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * mix(1.0, 1.6, aAge) * (60.0 / -mvPosition.z);
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

  void main() {
    if (vAlpha <= 0.0) discard;

    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float falloff = smoothstep(0.5, 0.0, d);

    vec3 color = mix(uHotCore, uFireColor, smoothstep(0.0, 0.15, vAge));
    color = mix(color, uSmokeColor, smoothstep(0.15, 1.0, vAge));

    gl_FragColor = vec4(color, falloff * vAlpha);
  }
`

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function smoothstepJS(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------
//
// DEBUG STYLING: still oversized (sizeMultiplier) for visibility while
// wiring this up — drop back to ~1 once confirmed. Colors now match the
// exhaust's hot-core-to-cool three-stage gradient rather than flat green.

export function SmokeRenderer({
  hotCore = '#ff2614',
  fireColor = '#8a1f52',
  smokeColor = '#0a1a4a',
  baseOpacity = 0.6,
  sizeMultiplier = 4,
}) {

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    const positions = new Float32Array(MAX_SMOKE * 3)
    const sizes = new Float32Array(MAX_SMOKE)
    const alphas = new Float32Array(MAX_SMOKE)
    const ages = new Float32Array(MAX_SMOKE)

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
    geo.setAttribute('aAge', new THREE.BufferAttribute(ages, 1))

    return geo
  }, [])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uHotCore: { value: new THREE.Color(hotCore) },
      uFireColor: { value: new THREE.Color(fireColor) },
      uSmokeColor: { value: new THREE.Color(smokeColor) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  }), [hotCore, fireColor, smokeColor])

  useFrame(() => {

    const posAttr = geometry.attributes.position
    const sizeAttr = geometry.attributes.aSize
    const alphaAttr = geometry.attributes.aAlpha
    const ageAttr = geometry.attributes.aAge

    for (let i = 0; i < MAX_SMOKE; i++) {

      if (!smokePool.alive[i]) {

        alphaAttr.array[i] = 0
        continue

      }

      const age = 1 - smokePool.life[i] / smokePool.maxLife[i]
      const fadeIn = smoothstepJS(0.0, 0.1, age)
      const fadeOut = 1.0 - smoothstepJS(0.6, 1.0, age)

      posAttr.array[i * 3 + 0] = smokePool.x[i]
      posAttr.array[i * 3 + 1] = smokePool.y[i]
      posAttr.array[i * 3 + 2] = 0

      sizeAttr.array[i] = smokeSize[i] * sizeMultiplier
      ageAttr.array[i] = age
      alphaAttr.array[i] = fadeIn * fadeOut * baseOpacity

    }

    posAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
    ageAttr.needsUpdate = true
  })

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  )
}