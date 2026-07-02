// src/renderers/PlayerRenderer.jsx

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playerQuery } from '../ecs/constants/queries.js';
import { Position, Rotation } from '../ecs/constants/components.js';
import { world } from '../ecs/constants/world.js';

export function PlayerRenderer() {
  const shipRef = useRef();
  const glowRef = useRef();
  
  const shipGeometry = useMemo(() => {
    const vertices = new Float32Array([

      // Main hull
      0.0, 0.7, 0,
      -0.55, -0.15, 0,
      -0.2, -0.05, 0,

      0.0, 0.7, 0,
      0.2, -0.05, 0,
      0.55, -0.15, 0,

      // Rear fin
      -0.2, -0.05, 0,
      0.0, -0.30, 0,
      0.2, -0.05, 0,

    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return geometry;
  }, []);

  const glowGeometry = useMemo(() => {
    const vertices = new Float32Array([
      // Cockpit
      0.0, 0.45, 0,
      -0.08, 0.10, 0,
      0.08, 0.10, 0,

      // Left wing highlight
      -0.42, -0.12, 0,
      -0.18, -0.08, 0,
      -0.30, -0.22, 0,

      // Right wing highlight
      0.42, -0.12, 0,
      0.18, -0.08, 0,
      0.30, -0.22, 0,
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    return geometry;
  }, []);

  useFrame(() => {
    const ids = playerQuery(world);
    if (!ids.length) return;

    const id = ids[0];

    const x = Position.x[id];
    const y = Position.y[id];
    const rot = Rotation[id];

    shipRef.current.position.set(x, y, 0);
    glowRef.current.position.set(x, y, 0.001);

    shipRef.current.rotation.z = rot;
    glowRef.current.rotation.z = rot;
  });

  return (
    <group>
      <mesh ref={shipRef} geometry={shipGeometry}>
        <meshBasicMaterial
          color="cyan"
          side={THREE.DoubleSide}
          wireframe
        />
      </mesh>

      <mesh ref={glowRef} geometry={glowGeometry}>
        <meshBasicMaterial
          color="#39ff14"
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}