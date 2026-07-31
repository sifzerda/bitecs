// src/renderers/StarfieldRenderer.jsx

import { useMemo, useRef, useCallback, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"

const STAR_COUNT = 1200
const STAR_Z = -5
const PADDING = 1.4 // extra margin so stars still cover the screen after resize/panning

/* ---------------------------------------------------------
   Nebula background — swirling arcade-style color and glow.
   Lives behind the stars; the stars themselves never move.
--------------------------------------------------------- */

const nebulaVertexShader = /* glsl */`

varying vec2 vUv;

void main(){

    vUv = uv;

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(position,1.0);

}
`

const nebulaFragmentShader = /* glsl */`

precision highp float;

uniform float uTime;

uniform vec3 uColorDeep;
uniform vec3 uColorBlue;
uniform vec3 uColorCyan;
uniform vec3 uColorGlow;
uniform vec3 uColorRed;
uniform vec3 uColorDeepRed;

varying vec2 vUv;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}

float snoise(vec2 v){

    const vec4 C=
    vec4(
        0.211324865405187,
        0.366025403784439,
       -0.577350269189626,
        0.024390243902439
    );

    vec2 i=floor(v+dot(v,C.yy));

    vec2 x0=v-i+dot(i,C.xx);

    vec2 i1=(x0.x>x0.y)?
        vec2(1.0,0.0):
        vec2(0.0,1.0);

    vec4 x12=x0.xyxy+C.xxzz;

    x12.xy-=i1;

    i=mod289(i);

    vec3 p=
        permute(
        permute(
        i.y+
        vec3(
            0.0,
            i1.y,
            1.0
        ))
        +
        i.x+
        vec3(
            0.0,
            i1.x,
            1.0
        ));

    vec3 m=max(
        0.5-
        vec3(
            dot(x0,x0),
            dot(x12.xy,x12.xy),
            dot(x12.zw,x12.zw)
        ),
        0.0
    );

    m*=m;
    m*=m;

    vec3 x=2.0*fract(p*C.www)-1.0;

    vec3 h=abs(x)-0.5;

    vec3 ox=floor(x+0.5);

    vec3 a0=x-ox;

    m*=1.79284291400159-
       0.85373472095314*
       (a0*a0+h*h);

    vec3 g;

    g.x=a0.x*x0.x+h.x*x0.y;
    g.y=a0.y*x12.x+h.y*x12.y;
    g.z=a0.z*x12.z+h.z*x12.w;

    return 130.0*dot(m,g);

}

float fbm(vec2 p){

    float v=0.0;
    float a=0.5;

    for(int i=0;i<7;i++){

        v+=a*snoise(p);

        p*=2.05;

        a*=0.55;

    }

    return v;

}

void main(){

    vec2 uv=vUv*2.0-1.0;

    //------------------------------------
    // VERY SLOW GALAXY ROTATION
    //------------------------------------

    float angle=uTime*0.00375;

    mat2 rot=
    mat2(
        cos(angle),
       -sin(angle),
        sin(angle),
        cos(angle)
    );

    uv=rot*uv;

    //------------------------------------
    // MILKY WAY BAND
    //------------------------------------

    float curve=
        sin(uv.x*1.1)*0.18;

    float band=
        exp(
            -pow(
                abs(uv.y+curve),
                2.0
            )*8.0
        );

    // Patchy brightness along the band's length, like real star clouds —
    // a true Milky Way isn't uniformly bright end to end.
    float patchiness =
        0.6 +
        0.4 * fbm(vec2(uv.x * 1.3, 1.5) + uTime * 0.01);

    band *= patchiness;

    //------------------------------------
    // DOMAIN WARP
    //------------------------------------

    vec2 p=uv*2.2;

    vec2 warp=
    vec2(
        fbm(p+vec2(uTime*0.015,0.0)),
        fbm(p+vec2(7.2,-uTime*0.015))
    );

    p+=warp*0.35;

    //------------------------------------
    // DUST DRIFT ANIMATION
    // Slides the fine dust/nebula texture steadily across the frame,
    // independent of the rotation/warp above — this is what makes the
    // starfield dust look like it's actually drifting over time.
    //------------------------------------

    vec2 drift = vec2(uTime * 0.03, -uTime * 0.015);
    vec2 pd = p + drift;

    //------------------------------------
    // MULTI SCALE CLOUDS
    //------------------------------------

    float large=
        fbm(pd*0.35);

    float medium=
        fbm(pd*0.8);

    float fine=
        fbm(pd*2.5);

    float nebula=
        large*0.55+
        medium*0.30+
        fine*0.15;

    //------------------------------------
    // DUST LANES
    //------------------------------------

    float dust=
        smoothstep(
            0.30,
            0.72,
            fbm(pd*1.7+10.0)
        );

    band*=1.0-dust*0.65;

    //------------------------------------
    // GALAXY CORE (kept tight and dimmer than before)
    //------------------------------------

    float core =
        exp(
            -length(
                uv * vec2(5.5,10.0)
            ) * 5.5
        );

    //------------------------------------
    // COLOR
    //------------------------------------

    vec3 color=uColorDeep;

    color=mix(
        color,
        uColorBlue,
        band*0.7
    );

    color=mix(
        color,
        uColorCyan,
        nebula*band*0.8
    );

    color+=
        uColorGlow*
        core*
        0.45;

    //------------------------------------
    // RED EMISSION — bright glints scattered through the band
    //------------------------------------

    float emission=
        pow(
            max(
                fbm(pd*4.0+18.0),
                0.0
            ),
            8.0
        );

    color+=
        uColorRed*
        emission*
        band*
        0.12;

    //------------------------------------
    // DEEP RED NEBULA PATCHES — larger, darker red clouds that sit
    // independently of the band, like H-alpha emission regions
    //------------------------------------

    float deepRedMask =
        smoothstep(
            0.50,
            0.85,
            fbm(pd*1.05 - 30.0)
        );

    color +=
        uColorDeepRed *
        deepRedMask *
        0.4;

    //------------------------------------
    // VIGNETTE
    //------------------------------------

    float vignette=
        smoothstep(
            1.7,
            0.45,
            length(uv)
        );

    color*=vignette;

    gl_FragColor=
        vec4(color,1.0);

}

`;

function NebulaBackground() {
    const viewport = useThree((state) => state.viewport)

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader: nebulaVertexShader,
            fragmentShader: nebulaFragmentShader,
uniforms:{

    uTime:{value:0},

    uColorDeep:{
        value:new THREE.Color("#010309")
    },

    uColorBlue:{
        value:new THREE.Color("#173d8d")
    },

    uColorCyan:{
        value:new THREE.Color("#4ed8ff")
    },

    uColorGlow:{
        value:new THREE.Color("#dff8ff")
    },

    uColorRed:{
        value:new THREE.Color("#ff6655")
    },

    uColorDeepRed:{
        value:new THREE.Color("#5c0f14")
    }

},
            depthWrite: false,
        })
    }, [])

    useEffect(() => () => material.dispose(), [material])

    useFrame((_, delta) => {
        material.uniforms.uTime.value += delta
    })

    const width = viewport.width * PADDING * 1.6
    const height = viewport.height * PADDING * 1.6

    return (
        <mesh position={[0, 0, STAR_Z - 4]} material={material} renderOrder={-2}>
            <planeGeometry args={[width, height]} />
        </mesh>
    )
}

/* ---------------------------------------------------------
   Static starfield — positions never change, sits above nebula
--------------------------------------------------------- */

function StarPoints() {
    const viewport = useThree((state) => state.viewport)

    const { geometry, material } = useMemo(() => {
        const fieldWidth = viewport.width * PADDING
        const fieldHeight = viewport.height * PADDING

        const positions = new Float32Array(STAR_COUNT * 3)
        for (let i = 0; i < STAR_COUNT; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * fieldWidth
            positions[i * 3 + 1] = (Math.random() - 0.5) * fieldHeight
            positions[i * 3 + 2] = STAR_Z
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

const material = new THREE.PointsMaterial({
    color: "#dffcff",
    size: 0.18,
    opacity: 0.95,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
})

        return { geometry, material }
    }, [viewport.width, viewport.height])

    return (
        <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
    )
}

/* ---------------------------------------------------------
   Shooting stars — molten streaks that fade gradually,
   plus occasional meteor showers (bursts of dimmer streaks)
--------------------------------------------------------- */

function makeStreakTexture() {
    const width = 128
    const height = 16
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")

    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, "rgba(255,255,255,0)")
    gradient.addColorStop(0.5, "rgba(255,170,90,0.35)")
    gradient.addColorStop(0.82, "rgba(255,225,150,0.85)")
    gradient.addColorStop(1, "rgba(255,255,255,1)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
}

function ShootingStars() {
    const scene = useThree((s) => s.scene)
    const viewport = useThree((s) => s.viewport)

    const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
    const texture = useMemo(() => makeStreakTexture(), [])

    const activeRef = useRef([])
    const timeoutsRef = useRef([])
    const mountedRef = useRef(true)
    const nextSpawnRef = useRef(2 + Math.random() * 4)
    const nextShowerRef = useRef(18 + Math.random() * 20)
    const viewportRef = useRef(viewport)
    viewportRef.current = viewport

    const spawnStreak = useCallback(
        (dim = false) => {
            if (!mountedRef.current) return
            const vp = viewportRef.current
            const w = vp.width * PADDING
            const h = vp.height * PADDING

            const angle = THREE.MathUtils.degToRad(-35 - Math.random() * 25) // down-and-right arc
            const dir = new THREE.Vector2(Math.cos(angle), Math.sin(angle))

            const margin = Math.max(w, h) * 0.3
            const startX = -w / 2 - margin + Math.random() * margin * 0.5
            const startY = h / 2 + margin * 0.3 - Math.random() * h * 0.6

            const speed = (dim ? 9 : 11) + Math.random() * 6
            const length = (dim ? 1.1 : 1.6) + Math.random() * 0.8
            const z = STAR_Z + (dim ? -0.5 : 1.5) + Math.random() * 0.5

            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })

            const mesh = new THREE.Mesh(geometry, material)
            mesh.scale.set(length, dim ? 0.05 : 0.07, 1)
            mesh.rotation.z = angle
            mesh.position.set(startX, startY, z)
            scene.add(mesh)

            activeRef.current.push({
                mesh,
                material,
                dir,
                speed,
                travel: 0,
                maxTravel: w + h,
                peakOpacity: dim ? 0.5 : 0.9,
            })
        },
        [scene, geometry, texture]
    )

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            timeoutsRef.current.forEach(clearTimeout)
            activeRef.current.forEach((star) => {
                scene.remove(star.mesh)
                star.material.dispose()
            })
            activeRef.current = []
            geometry.dispose()
            texture.dispose()
        }
    }, [scene, geometry, texture])

    useFrame((_, delta) => {
        // lone shooting stars, fairly frequent
        nextSpawnRef.current -= delta
        if (nextSpawnRef.current <= 0) {
            spawnStreak(false)
            nextSpawnRef.current = 6 + Math.random() * 9
        }

        // occasional meteor shower: a burst of dimmer, staggered streaks
        nextShowerRef.current -= delta
        if (nextShowerRef.current <= 0) {
            const count = 6 + Math.floor(Math.random() * 6)
            for (let i = 0; i < count; i++) {
                const id = setTimeout(() => spawnStreak(true), i * (80 + Math.random() * 140))
                timeoutsRef.current.push(id)
            }
            nextShowerRef.current = 25 + Math.random() * 30
        }

        const remaining = []
        for (const star of activeRef.current) {
            star.travel += star.speed * delta
            star.mesh.position.x += star.dir.x * star.speed * delta
            star.mesh.position.y += star.dir.y * star.speed * delta

            const t = star.travel / star.maxTravel
            const fadeIn = Math.min(t / 0.08, 1)
            const fadeOut = 1 - Math.min(Math.max((t - 0.7) / 0.3, 0), 1) // gradual fade at the tail end
            star.material.opacity = star.peakOpacity * fadeIn * fadeOut

            if (t >= 1) {
                scene.remove(star.mesh)
                star.material.dispose()
            } else {
                remaining.push(star)
            }
        }
        activeRef.current = remaining
    })

    return null
}

/* ---------------------------------------------------------
   Exported renderer
--------------------------------------------------------- */

export function StarfieldRenderer() {
    return (
        <>
            <NebulaBackground />
            <StarPoints />
            <ShootingStars />
        </>
    )
}