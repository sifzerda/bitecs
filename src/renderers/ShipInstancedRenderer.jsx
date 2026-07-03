// ShipInstancedRenderer.jsx
// Drop-in renderer following the same pattern as your other entity-family
// renderers: one InstancedMesh per visual piece, matrices written in
// useFrame from live ECS component arrays.
//
// Adjust the `defineQuery`/component imports to match your actual bitECS
// world setup — the shapes/geometry are the part that's fully baked in;
// the ECS wiring below is a reasonable-default skeleton.

import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { defineQuery } from 'bitecs';
import { Position, Rotation, ScaleC, ShipTag } from '../ecs/components'; // adjust to your paths
import { buildShipPieces, DEFAULT_SHIP_PARAMS } from './shipParts';

const shipQuery = defineQuery([Position, Rotation, ShipTag]);

const MAX_SHIPS = 64; // bump to your expected max concurrent ships

const dummy = new THREE.Object3D();

/**
 * @param {object} props
 * @param {any} props.world              bitECS world
 * @param {object} [props.params]        overrides merged into DEFAULT_SHIP_PARAMS,
 *                                        e.g. { wingSpan: 2.1 } to widen every ship's wings
 * @param {number} [props.uniformScale]  extra multiplier applied on top of each entity's own scale
 */
export default function ShipInstancedRenderer({ world, params, uniformScale = 1 }) {
  const meshRefs = useRef({});

  // Geometry only needs to be rebuilt when the piece params actually change,
  // not every frame.
  const pieces = useMemo(() => buildShipPieces({ ...DEFAULT_SHIP_PARAMS, ...params }), [params]);

  // Zero out unused instances off-screen the first time meshes mount.
  useLayoutEffect(() => {
    pieces.forEach((piece) => {
      const mesh = meshRefs.current[piece.name];
      if (!mesh) return;
      dummy.position.set(0, -9999, 0);
      dummy.updateMatrix();
      for (let i = 0; i < MAX_SHIPS; i++) mesh.setMatrixAt(i, dummy.matrix);
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [pieces]);

  useFrame(() => {
    if (!world) return;
    const entities = shipQuery(world);
    const count = Math.min(entities.length, MAX_SHIPS);

    for (let i = 0; i < count; i++) {
      const eid = entities[i];
      const x = Position.x[eid];
      const y = Position.y[eid] ?? 0;
      const z = Position.z[eid];
      const rotY = Rotation.y[eid] ?? 0;
      const scale = (ScaleC ? ScaleC.value[eid] : 1) * uniformScale;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      pieces.forEach((piece) => {
        const mesh = meshRefs.current[piece.name];
        if (mesh) mesh.setMatrixAt(i, dummy.matrix);
      });
    }

    // Park any leftover instance slots off-screen so despawned ships vanish.
    for (let i = count; i < MAX_SHIPS; i++) {
      dummy.position.set(0, -9999, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      pieces.forEach((piece) => {
        const mesh = meshRefs.current[piece.name];
        if (mesh) mesh.setMatrixAt(i, dummy.matrix);
      });
    }

    pieces.forEach((piece) => {
      const mesh = meshRefs.current[piece.name];
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {pieces.map((piece) => (
        <instancedMesh
          key={piece.name}
          ref={(el) => (meshRefs.current[piece.name] = el)}
          args={[piece.geometry, undefined, MAX_SHIPS]}
          frustumCulled={false}
        >
          <meshBasicMaterial color={piece.color} side={THREE.DoubleSide} />
        </instancedMesh>
      ))}
    </group>
  );
}
