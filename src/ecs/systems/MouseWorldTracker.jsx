// src/ecs/systems/MouseWorldTracker.jsx

import { useFrame, useThree } from '@react-three/fiber';
import { input } from './input';
import { settings } from './settings.js';

export default function MouseWorldTracker() {
  const { viewport, size } = useThree();

  useFrame(() => {
    input.worldX = (input.mouseX / size.width - 0.5) * viewport.width;
    input.worldY = (0.5 - input.mouseY / size.height) * viewport.height;

    if (settings.controlScheme !== 'keyboardMouse') {
    }
  });

  return null;
}