// src/renderers/SmokeRenderer.jsx

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { smokePool, updateSmokeEmitter } from '../fx/gpu/SmokeEmitter.js'

const MAX_SMOKE = smokePool.capacity

// ------------------------------------------------------------
// GPU COMPACT BUFFERS
// ------------------------------------------------------------

const gpuPosition = new Float32Array(MAX_SMOKE * 3)
const gpuSize = new Float32Array(MAX_SMOKE)
const gpuAlpha = new Float32Array(MAX_SMOKE)
const gpuAge = new Float32Array(MAX_SMOKE)

// ------------------------------------------------------------
// shaders
// ------------------------------------------------------------

const vertexShader = /* glsl */ `

attribute float aSize;
attribute float aAlpha;
attribute float aAge;

varying float vAlpha;
varying float vAge;

uniform float uSizeMultiplier;

void main(){

    vAlpha = aAlpha;
    vAge = aAge;

    vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

    gl_PointSize = aSize * uSizeMultiplier * mix(1.0,1.6,aAge) * (60.0 / -mvPosition.z);
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

void main(){

    if(vAlpha <= 0.0)
        discard;

    float d = length(gl_PointCoord - vec2(0.5));

    if(d > 0.5)
        discard;

    float falloff = smoothstep(0.5, 0.0, d);
    vec3 color = mix(uHotCore, uFireColor, smoothstep(0.0, 0.15, vAge));
    color = mix(color, uSmokeColor, smoothstep(0.15, 1.0, vAge));

    gl_FragColor = vec4(color, falloff * vAlpha * uOpacity);
}

`
// ------------------------------------------------------------
// Renderer
// ------------------------------------------------------------

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

    geo.setAttribute("position", new THREE.BufferAttribute(gpuPosition, 3))
    geo.setAttribute("aSize", new THREE.BufferAttribute(gpuSize, 1))
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(gpuAlpha, 1))
    geo.setAttribute("aAge", new THREE.BufferAttribute(gpuAge, 1))
    geo.setDrawRange(0, 0)

    return geo

  }, [])

  const material = useMemo(() => {

    return new THREE.ShaderMaterial({

      uniforms: {
        uHotCore: { value: new THREE.Color(hotCore) },
        uFireColor: { value: new THREE.Color(fireColor) },
        uSmokeColor: { value: new THREE.Color(smokeColor) },
        uOpacity: { value: baseOpacity },
        uSizeMultiplier: { value: sizeMultiplier }
      },

      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    })


  }, [hotCore, fireColor, smokeColor, baseOpacity, sizeMultiplier])

  useFrame((_, dt) => {

    updateSmokeEmitter(dt)
    const p = smokePool
    let count = 0

    // ----------------------------------------------------
    // compact active particles
    // ----------------------------------------------------

    for (let n = 0; n < p.activeCount; n++) {

      const id = p.activeIds[n]
      const src = id * 3
      const dst = count * 3

      gpuPosition[dst] = p.instancePosition[src]
      gpuPosition[dst + 1] = p.instancePosition[src + 1]
      gpuPosition[dst + 2] = p.instancePosition[src + 2]

      gpuSize[count] = p.instanceScale[id]
      gpuAlpha[count] = p.instanceAlpha[id]
      gpuAge[count] = p.age[id]

      count++
    }

    const geo = geometry

    geo.setDrawRange(0, count)

    if (count === 0)
      return

    if (!p.dirty && pointsRef.current)
      return

    geo.attributes.position.needsUpdate = true
    geo.attributes.aSize.needsUpdate = true
    geo.attributes.aAlpha.needsUpdate = true
    geo.attributes.aAge.needsUpdate = true

    p.dirty = false

  })

  return (
    <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
  )

}