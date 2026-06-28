// src/renderers/Scene.jsx

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { world } from '../ecs/world.js'
import { gameLoop } from '../ecs/systems/gameLoop.js'
import { PlayerRenderer } from './PlayerRenderer.jsx'
import { AsteroidRenderer } from './AsteroidRenderer.jsx'
import { BulletRenderer } from './BulletRenderer.jsx'

export function Scene({ keysRef, paused }) {

    const shootState = useRef({timer: 0})

    useFrame((_, delta)=>{

        if(paused) return

        world.time.delta = Math.min(delta,0.05)
        world.time.elapsed += world.time.delta
        gameLoop(keysRef.current, shootState.current)
    })

    return (
        <>
            <ambientLight intensity={0.4}/>
            <pointLight
                position={[0,0,5]}
                intensity={2}
                color="#ffffff"
            />
            <PlayerRenderer />
            <AsteroidRenderer />
            <BulletRenderer />
        </>
    )
}