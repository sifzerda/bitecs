// src/renderers/PoolParticles.jsx

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

//=====================================//

const vertexShader = `
attribute vec3 aPosition;
attribute vec2 aSize;
attribute float aRotation;
attribute vec3 aColor;
attribute float aAlpha;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vUv = uv; vColor = aColor; vAlpha = aAlpha;
  vec2 p = position.xy * aSize;
  float c = cos(aRotation), s = sin(aRotation);
  p = vec2(p.x*c-p.y*s, p.x*s+p.y*c);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(aPosition + vec3(p,0.0),1.0);
}`

//========================================//

const fragmentShader = `
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
uniform float uKind;
void main() {
  vec2 p = (vUv-0.5)*2.0;
  float d = length(p);
  float alpha = (1.0-smoothstep(0.0,1.0,d))*vAlpha;
  vec3 color = vColor;
  if (uKind < 0.5) {
    float taper = smoothstep(0.0,0.15,vUv.x)*(1.0-smoothstep(0.8,1.0,vUv.x));
    float core = pow(1.0-smoothstep(0.0,0.6,abs(p.y)),2.0)*taper;
    alpha = (core + 0.3*(1.0-smoothstep(0.0,1.0,d)))*vAlpha;
    color = mix(vColor,vec3(1.0,0.95,0.8),core)*1.8;
  }
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(color,alpha);
}`

// Compact output buffers never alias sparse simulation arrays.
export function PoolParticles({ pool, kind = 1, sample, additive = true }) {

    const ref = useRef()
    const data = useMemo(() => {

        const base = new THREE.PlaneGeometry(1, 1)

        const geometry = new THREE.InstancedBufferGeometry()
        geometry.setIndex(base.index.clone())

        for (const name of ["position", "uv"]) geometry.setAttribute(name, base.attributes[name].clone())
        base.dispose()

        for (const [name, size] of [
            ["aPosition", 3],
            ["aSize", 2],
            ["aRotation", 1],
            ["aColor", 3],
            ["aAlpha", 1]
        ]) {
            geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(pool.capacity * size), size).setUsage(THREE.DynamicDrawUsage))
        }
        geometry.instanceCount = 0
        return geometry
    }, [pool])

    const scratch = useMemo(() => ({ x: 0, y: 0, z: 0, width: 1, height: 1, rotation: 0, r: 1, g: 1, b: 1, alpha: 1 }), [])

    useFrame(() => {
        const count = Math.min(pool.activeCount, pool.capacity)

        data.instanceCount = count

        if (!count) return
        const a = data.attributes

        for (let n = 0; n < count; n++) {
            const id = pool.activeIds[n]

            sample(pool, id, scratch)
            a.aPosition.setXYZ(n, scratch.x, scratch.y, scratch.z)
            a.aSize.setXY(n, scratch.width, scratch.height)
            a.aRotation.setX(n, scratch.rotation)
            a.aColor.setXYZ(n, scratch.r, scratch.g, scratch.b)
            a.aAlpha.setX(n, scratch.alpha)

        }
        for (const name of ["aPosition", "aSize", "aRotation", "aColor", "aAlpha"]) {

            const attr = a[name]
            attr.clearUpdateRanges();
            attr.addUpdateRange(0, count * attr.itemSize);
            attr.needsUpdate = true
        }
    })

    return (
        <mesh ref={ref} geometry={data} frustumCulled={false}>
            <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={{ uKind: { value: kind } }} transparent depthTest={false} depthWrite={false} toneMapped={false} blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending} />
        </mesh>
    )
}
