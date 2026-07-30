// src/ecs/systems/MouseWorldTracker.jsx

import { useFrame, useThree } from '@react-three/fiber';
import { input } from './input';
import { settings } from './settings.js';

export default function MouseWorldTracker() {
  const { viewport, size } = useThree();

  useFrame(() => {
    // always keep world coords fresh (cheap)
    input.worldX = (input.mouseX / size.width - 0.5) * viewport.width;
    input.worldY = (0.5 - input.mouseY / size.height) * viewport.height;

    // optional: zero them when mouse mode is off so systems don't aim at stale point
    if (settings.controlScheme !== 'keyboardMouse') {
      // leave coords as-is, or uncomment to neutralise:
      // input.worldX = 0;
      // input.worldY = 0;
    }
  });

  return null;
}