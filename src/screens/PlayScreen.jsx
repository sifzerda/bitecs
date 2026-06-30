// src/screens/PlayScreen.jsx

import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, SMAA,
    //   ShockWave,
    // Glitch
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing'
import { Sparkles, Trail, Float } from '@react-three/drei'
import { useRef } from 'react'
import { world } from '../ecs/constants/world.js'
import { gameLoop } from '../ecs/systems/gameLoop.js'
import { PlayerRenderer } from '../renderers/PlayerRenderer.jsx'
import { AsteroidRenderer } from '../renderers/AsteroidRenderer.jsx'
import { BulletRenderer } from '../renderers/BulletRenderer.jsx'

export function PlayScreen({ keysRef, paused }) {

    const shootState = useRef({ timer: 0 })

    useFrame((_, delta) => {

        if (paused) return

        world.time.delta = Math.min(delta, 0.05)
        world.time.elapsed += world.time.delta
        gameLoop(keysRef.current, shootState.current)
    })

    return (
        <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <pointLight
                position={[0, 0, 5]}
                intensity={2}
                color="#ffffff"
            />
            <PlayerRenderer />
            <AsteroidRenderer />
            <BulletRenderer />

            <EffectComposer multisampling={0}>
                <Bloom
                    intensity={2.5}
                    luminanceThreshold={0.2}
                    luminanceSmoothing={0.9}
                    mipmapBlur />
                <ChromaticAberration
                    blendFunction={BlendFunction.NORMAL}
                    offset={[0.0015, 0.0012]} />
                <Noise opacity={0.025} />
                <Vignette
                    eskil={false}
                    offset={0.12}
                    darkness={0.9} />

                {/* <ShockWave active position={[-0.2, -0.2, 0]} speed={1.5} maxRadius={5} waveSize={0.25} amplitude={0.4} /> */}
                {/* <Glitch blendFunction={BlendFunction.NORMAL} active offset={0.12} strength={0.1} mode={0} /> */}

            </EffectComposer>
            <SMAA />
        </>
    )
}