// src/screens/PlayScreen.jsx

import { useFrame } from '@react-three/fiber'
import {
    EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, SMAA,
    // ShockWave,
    // Glitch
} from '@react-three/postprocessing';
import { Canvas } from '@react-three/fiber'
import { BlendFunction } from 'postprocessing'
import { Sparkles, Trail, Float } from '@react-three/drei'
import { useRef } from 'react'
import { HUD } from '../components/HUD.jsx'
import { world } from '../ecs/constants/world.js'
import { gameLoop } from '../ecs/systems/gameLoop.js'

import { PlayerRenderer } from '../renderers/PlayerRenderer.jsx'
import { AsteroidRenderer } from '../renderers/AsteroidRenderer.jsx'
import { BulletRenderer } from '../renderers/BulletRenderer.jsx'

export function GameLoop({ keysRef, paused }) {
    const shootState = useRef({ timer: 0 })

    useFrame((_, delta) => {

        if (paused) return

        world.time.delta = Math.min(delta, 0.05)
        world.time.elapsed += world.time.delta
        gameLoop(keysRef.current, shootState.current)
    })

    return null
}

export function PlayScreen({ keysRef, paused, onPause }) {
    return (
        <div className="border-2 border-green-400">
            <div className="relative flex-1 h-[calc(100vh-120px)] px-4">

                <HUD paused={paused} onPause={onPause} />

                <Canvas
                    orthographic
                    camera={{
                        zoom: 60,
                        position: [0, 0, 10],
                        near: 0.1,
                        far: 100,
                    }}
                    gl={{
                        antialias: false,
                        powerPreference: "high-performance",
                    }}
                    dpr={[1, 2]}
                >
                    <GameLoop keysRef={keysRef} paused={paused} />

                    <ambientLight intensity={0.4} />
                    <directionalLight position={[5, 5, 5]} intensity={1.0} />
                    <pointLight position={[0, 0, 5]} intensity={2} color="#ffffff" />

                    <PlayerRenderer />
                    <AsteroidRenderer />
                    <BulletRenderer />

                    <EffectComposer multisampling={0}>

                        <Bloom
                            intensity={2.2}
                            luminanceThreshold={0.05}
                            luminanceSmoothing={0.35}
                            mipmapBlur
                        />

                        {/* Slight RGB split near screen edges */}
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={[0.0015, 0.001]}
                        />

                        {/* Darken screen edges */}
                        <Vignette
                            eskil={false}
                            offset={0.18}
                            darkness={0.8}
                        />

                        <Noise opacity={0.02} />
                        {/* postprocessing */}
                    </EffectComposer>

                    <SMAA />
                </Canvas>

            </div>
        </div>
    )
}