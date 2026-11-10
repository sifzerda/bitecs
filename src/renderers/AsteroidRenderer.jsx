// src/renderers/AsteroidRenderer.jsx

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

import {
    activeAsteroids,
    ASTEROID_POOL_SIZE,
} from "../ecs/pools/asteroidPool.js"

import {
    Position,
    Health,
    Asteroid,
} from "../ecs/constants/components.js"

import {
    ASTEROID_TYPE,
} from "../ecs/asteroids/asteroidTypes.js"

// ============================================================
// CONFIGURATION
// ============================================================

const MAX_ASTEROIDS = ASTEROID_POOL_SIZE

const BAR_WIDTH = 1.2
const BAR_HEIGHT = 0.12
const BAR_OFFSET = 0.9

const TAU = Math.PI * 2

// ============================================================
// ASTEROID APPEARANCES
// ============================================================

const APPEARANCES = {
    [ASTEROID_TYPE.NORMAL]: {
        color: "#a8846a",
        emissive: "#574638",
        glow: 0.18,
        spinMultiplier: 1,
        deformation: 1,
    },

    [ASTEROID_TYPE.HEAVY]: {
        color: "#858b9b",
        emissive: "#404756",
        glow: 0.12,
        spinMultiplier: 0.35,
        deformation: 0.75,
    },

    [ASTEROID_TYPE.FAST]: {
        color: "#f0c777",
        emissive: "#9e672c",
        glow: 0.35,
        spinMultiplier: 2.5,
        deformation: 1.15,
    },

    [ASTEROID_TYPE.ERRATIC]: {
        color: "#ae7ce5",
        emissive: "#633a96",
        glow: 0.4,
        spinMultiplier: 1.8,
        deformation: 1.3,
    },

    [ASTEROID_TYPE.SPLITTER]: {
        color: "#ed8750",
        emissive: "#e65c25",
        glow: 0.65,
        spinMultiplier: 0.8,
        deformation: 1.2,
    },

    [ASTEROID_TYPE.HUNTER]: {
        color: "#e15c68",
        emissive: "#a82739",
        glow: 0.55,
        spinMultiplier: 1.4,
        deformation: 1.1,
    },
}

// ============================================================
// REUSABLE SCRATCH OBJECTS
// ============================================================

const matrix = new THREE.Matrix4()
const position = new THREE.Vector3()
const quaternion = new THREE.Quaternion()
const scaleVector = new THREE.Vector3()
const euler = new THREE.Euler()

const barMatrix = new THREE.Matrix4()

const scratchColor = new THREE.Color()

// ============================================================
// STABLE ENTITY RANDOMNESS
// ============================================================

// Deterministic random number based on entity ID,
// spawn version, and an additional seed.
function hash(id, version, seed = 0) {
    let value =
        Math.imul(id + 1, 374761393) ^
        Math.imul(version + 1, 668265263) ^
        Math.imul(seed + 1, 2246822519)

    value = Math.imul(value ^ (value >>> 13), 1274126177)
    value ^= value >>> 16

    return (value >>> 0) / 4294967296
}

function getAppearance(type) {
    return (
        APPEARANCES[type] ??
        APPEARANCES[ASTEROID_TYPE.NORMAL]
    )
}

// ============================================================
// GEOMETRY
// ============================================================

function createAsteroidGeometry() {
    const geometry = new THREE.IcosahedronGeometry(0.55, 2)
    const positions = geometry.attributes.position

    const vertex = new THREE.Vector3()
    const direction = new THREE.Vector3()

    for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i)
        direction.copy(vertex).normalize()

        const base =
            Math.sin(direction.x * 2.3) * 0.22 +
            Math.sin(direction.y * 5.7) * 0.15 +
            Math.sin(direction.z * 9.1) * 0.1

        const jagged =
            Math.sin(
                direction.x * 18 +
                direction.y * 7
            ) * 0.05 +
            Math.sin(
                direction.y * 23 +
                direction.z * 11
            ) * 0.04 +
            Math.sin(
                direction.z * 27 +
                direction.x * 13
            ) * 0.035

        const spikeMask = Math.pow(
            Math.max(
                0,
                Math.sin(
                    direction.x * 31 +
                    direction.z * 17
                )
            ),
            6
        )

        const spike = spikeMask * 0.06

        const noise = THREE.MathUtils.clamp(
            base + jagged + spike,
            -0.3,
            0.3
        )

        vertex.multiplyScalar(1 + noise)

        positions.setXYZ(
            i,
            vertex.x,
            vertex.y,
            vertex.z
        )
    }

    positions.needsUpdate = true
    geometry.computeVertexNormals()

    // Custom attributes for the asteroid shader.
    geometry.setAttribute(
        "instanceHealth",
        new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_ASTEROIDS).fill(1),
            1
        )
    )

    geometry.setAttribute(
        "instanceGlow",
        new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_ASTEROIDS),
            1
        )
    )

    geometry.setAttribute(
        "instanceType",
        new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_ASTEROIDS),
            1
        )
    )

    geometry.setAttribute(
        "instanceHitFlash",
        new THREE.InstancedBufferAttribute(
            new Float32Array(MAX_ASTEROIDS), 1
        ).setUsage(THREE.DynamicDrawUsage)
    )

    return geometry
}

// ============================================================
// MATERIAL
// ============================================================

function createAsteroidMaterial() {
    const material = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        flatShading: true,
        roughness: 0.85,
        metalness: 0.15,
        emissive: "#504038",
        emissiveIntensity: 0.3,
        side: THREE.FrontSide,
    })

    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 }

        shader.vertexShader = shader.vertexShader
            .replace(
                "#include <common>",
                `
                #include <common>

                attribute float instanceHealth;
                attribute float instanceGlow;
                attribute float instanceType;
                attribute float instanceHitFlash;
                varying float vHitFlash;

                varying float vHealth;
                varying float vGlow;
                varying float vAsteroidType;
                varying vec3 vLocalPosition;
                `
            )
            .replace(
                "#include <begin_vertex>",
                `
                #include <begin_vertex>

                vHealth = instanceHealth;
                vGlow = instanceGlow;
                vAsteroidType = instanceType;
                vHitFlash = instanceHitFlash;
                vLocalPosition = position;
                `
            )

        shader.fragmentShader = shader.fragmentShader
            .replace(
                "#include <common>",
                `
                #include <common>

                uniform float uTime;

                varying float vHealth;
                varying float vGlow;
                varying float vAsteroidType;
                varying float vHitFlash;
                varying vec3 vLocalPosition;
                `
            )
            .replace(
                "#include <emissivemap_fragment>",
                `
                #include <emissivemap_fragment>

                totalEmissiveRadiance += vec3(1.0, 0.92, 0.78) *
                    clamp(vHitFlash, 0.0, 1.0) * 2.2;

                float health = clamp(vHealth, 0.0, 1.0);
                float damage = 1.0 - health;

                // --------------------------------------------
                // RIM LIGHT
                // --------------------------------------------

                float rimDot = max(
                    dot(
                        normalize(normal),
                        normalize(vViewPosition)
                    ),
                    0.0
                );

                float rim = pow(1.0 - rimDot, 2.5);

                totalEmissiveRadiance +=
                    rim * vec3(0.55, 0.5, 0.45) * 0.45;

                // --------------------------------------------
                // DAMAGE GLOW
                // --------------------------------------------

                float damagePulse =
                    0.6 +
                    0.4 * sin(
                        uTime * (3.0 + damage * 10.0)
                    );

                vec3 damageColor = mix(
                    vec3(1.0, 0.5, 0.15),
                    vec3(1.0, 0.12, 0.05),
                    damage
                );

                totalEmissiveRadiance +=
                    damageColor *
                    damage *
                    damage *
                    damagePulse *
                    1.8;

                // --------------------------------------------
                // TYPE-SPECIFIC GLOW
                // --------------------------------------------

                vec3 typeGlow = vec3(0.45, 0.35, 0.25);

                if (vAsteroidType > 4.5) {
                    // Hunter
                    typeGlow = vec3(1.0, 0.08, 0.15);
                }
                else if (vAsteroidType > 3.5) {
                    // Splitter
                    typeGlow = vec3(1.0, 0.28, 0.04);
                }
                else if (vAsteroidType > 2.5) {
                    // Erratic
                    typeGlow = vec3(0.5, 0.2, 1.0);
                }
                else if (vAsteroidType > 1.5) {
                    // Fast
                    typeGlow = vec3(1.0, 0.7, 0.15);
                }
                else if (vAsteroidType > 0.5) {
                    // Heavy
                    typeGlow = vec3(0.35, 0.45, 0.65);
                }

                float pulse =
                    0.75 +
                    0.25 * sin(
                        uTime * 2.5 +
                        vAsteroidType
                    );

                totalEmissiveRadiance +=
                    typeGlow * vGlow * pulse * 0.35;

                // --------------------------------------------
                // SPLITTER CRACKS
                // --------------------------------------------

                if (
                    vAsteroidType > 3.5 &&
                    vAsteroidType < 4.5
                ) {
                    vec3 p = vLocalPosition * 16.0;

                    float crack =
                        abs(
                            sin(p.x * 2.1 + p.y * 1.3) *
                            cos(p.z * 1.8 - p.x * 0.7)
                        );

                    float cracks =
                        1.0 -
                        smoothstep(0.04, 0.14, crack);

                    float crackPulse =
                        0.75 +
                        0.25 * sin(uTime * 4.0);

                    totalEmissiveRadiance +=
                        vec3(1.0, 0.22, 0.025) *
                        cracks *
                        crackPulse *
                        1.6;
                }
                `
            )

        material.userData.shader = shader
    }

    return material
}

// ============================================================
// RENDERER
// ============================================================

export function AsteroidRenderer() {
    const meshRef = useRef(null)
    const bgBarRef = useRef(null)
    const fgBarRef = useRef(null)

    const geometry = useMemo(
        () => createAsteroidGeometry(),
        []
    )

    const material = useMemo(
        () => createAsteroidMaterial(),
        []
    )

    // Reused cache: keyed by entity ID, not render index.
    const appearanceCache = useRef(new Map())

    useEffect(() => {
        return () => {
            geometry.dispose()
            material.dispose()
        }
    }, [geometry, material])

    // --------------------------------------------------------
    // ENTITY APPEARANCE
    // --------------------------------------------------------

    function getEntityAppearance(id) {
        const version = Asteroid.spawnVersion[id]
        const cached = appearanceCache.current.get(id)

        if (cached && cached.version === version) {
            return cached
        }

        const type = Asteroid.type[id]
        const config = getAppearance(type)

        const color = new THREE.Color(config.color)

        color.offsetHSL(
            (hash(id, version, 1) - 0.5) * 0.025,
            (hash(id, version, 2) - 0.5) * 0.12,
            (hash(id, version, 3) - 0.5) * 0.14
        )

        const data = {
            version,
            color,
            rotationX: hash(id, version, 4) * TAU,
            rotationY: hash(id, version, 5) * TAU,
            rotationZ: hash(id, version, 6) * TAU,
            tiltX: (hash(id, version, 7) - 0.5) * 0.6,
            tiltY: (hash(id, version, 8) - 0.5) * 0.6,
        }

        appearanceCache.current.set(id, data)

        return data
    }

    // --------------------------------------------------------
    // FRAME UPDATE
    // --------------------------------------------------------

    useFrame((state) => {
        const mesh = meshRef.current
        const bgBar = bgBarRef.current
        const fgBar = fgBarRef.current

        if (!mesh || !bgBar || !fgBar) return

        const count = Math.min(
            activeAsteroids.length,
            MAX_ASTEROIDS
        )

        const healthAttr =
            geometry.attributes.instanceHealth

        const glowAttr =
            geometry.attributes.instanceGlow

        const typeAttr =
            geometry.attributes.instanceType

        const flashAttr = geometry.attributes.instanceHitFlash

        // Update shader time.
        if (material.userData.shader) {
            material.userData.shader.uniforms.uTime.value =
                state.clock.elapsedTime
        }

        // ----------------------------------------------------
        // UPDATE ASTEROID INSTANCES
        // ----------------------------------------------------

        for (let i = 0; i < count; i++) {
            const id = activeAsteroids[i]

            const type = Asteroid.type[id]
            const config = getAppearance(type)
            const data = getEntityAppearance(id)

            const x = Position.x[id]
            const y = Position.y[id]

            const scale = Asteroid.scale[id]

            // -----------------------------------------------
            // ROTATION
            // -----------------------------------------------

            // Rotation comes from ECS simulation state,
            // rather than accumulating by render index.
            const spin =
                Asteroid.visualRotation[id] *
                config.spinMultiplier

            euler.set(
                data.rotationX + spin * 0.35 + data.tiltX,
                data.rotationY + spin * 0.55 + data.tiltY,
                data.rotationZ + spin
            )

            quaternion.setFromEuler(euler)

            // -----------------------------------------------
            // TRANSFORM
            // -----------------------------------------------

            position.set(x, y, 0)

            const deformation =
                config.deformation ?? 1

            scaleVector.set(
                scale * deformation,
                scale * deformation,
                scale
            )

            matrix.compose(
                position,
                quaternion,
                scaleVector
            )

            mesh.setMatrixAt(i, matrix)

            // -----------------------------------------------
            // INSTANCE COLOUR
            // -----------------------------------------------

            mesh.setColorAt(i, data.color)

            // -----------------------------------------------
            // HEALTH
            // -----------------------------------------------

            const maxHealth = Health.max[id]

            const pct =
                maxHealth > 0
                    ? THREE.MathUtils.clamp(
                        Health.current[id] / maxHealth,
                        0,
                        1
                    )
                    : 0

            healthAttr.array[i] = pct
            glowAttr.array[i] = config.glow
            typeAttr.array[i] = type
            flashAttr.array[i] = Math.min(1, Math.max(0,
                Asteroid.hitFlash[id] / 0.14
            )) * Asteroid.hitIntensity[id]

            // -----------------------------------------------
            // HEALTH BAR POSITION
            // -----------------------------------------------

            const barY =
                y + BAR_OFFSET * Math.max(1, scale)

            barMatrix.makeScale(
                BAR_WIDTH,
                BAR_HEIGHT,
                1
            )

            barMatrix.setPosition(x, barY, 0)

            bgBar.setMatrixAt(i, barMatrix)

            // -----------------------------------------------
            // HEALTH BAR FILL
            // -----------------------------------------------

            const fillWidth = BAR_WIDTH * pct

            const offsetX =
                (BAR_WIDTH - fillWidth) * 0.5

            barMatrix.makeScale(
                fillWidth,
                BAR_HEIGHT,
                1
            )

            barMatrix.setPosition(
                x - offsetX,
                barY,
                0.01
            )

            fgBar.setMatrixAt(i, barMatrix)
        }

        // ----------------------------------------------------
        // GPU UPDATES
        // ----------------------------------------------------

        mesh.count = count
        bgBar.count = count
        fgBar.count = count

        mesh.instanceMatrix.needsUpdate = true

        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true
        }

        bgBar.instanceMatrix.needsUpdate = true
        fgBar.instanceMatrix.needsUpdate = true

        healthAttr.needsUpdate = true
        glowAttr.needsUpdate = true
        typeAttr.needsUpdate = true
        flashAttr.needsUpdate = true
    })

    // ========================================================
    // JSX
    // ========================================================

    return (
        <>
            {/* ASTEROIDS */}
            <instancedMesh
                ref={meshRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}
            >
                <primitive
                    object={geometry}
                    attach="geometry"
                />

                <primitive
                    object={material}
                    attach="material"
                />
            </instancedMesh>

            {/* HEALTH BAR BACKGROUND */}
            <instancedMesh
                ref={bgBarRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}
            >
                <planeGeometry args={[1, 1]} />

                <meshBasicMaterial
                    color="#a52232"
                    transparent
                    opacity={0.9}
                    depthWrite={false}
                />
            </instancedMesh>

            {/* HEALTH BAR FILL */}
            <instancedMesh
                ref={fgBarRef}
                args={[null, null, MAX_ASTEROIDS]}
                frustumCulled={false}
            >
                <planeGeometry args={[1, 1]} />

                <meshBasicMaterial
                    color="#44ff88"
                    depthWrite={false}
                />
            </instancedMesh>
        </>
    )
}
