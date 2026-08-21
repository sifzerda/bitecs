// src/ecs/systems/input.js

import { simState } from "../../state/simState.js"
import { WEAPONS } from "../weapons/config/weapons.js";
import { settings } from "../systems/settings.js";

export const input = {
  left: false,
  right: false,

  thrust: false,
  brake: false,

  fire: false,
  deflect: false,

  mouseX: 0,
  mouseY: 0,

  worldX: 0,
  worldY: 0,
};

export const mouse = input;

const bindings = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'thrust',
  ArrowDown: 'brake',

  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'thrust',
  KeyS: 'brake',

  Space: 'fire',
  Spacebar: 'fire',

  KeyX: 'deflect',
};

const weaponKeys = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Digit6: 5,
  Digit7: 6,
  Digit8: 7,
  Digit9: 8,
  Digit0: 9,
};

const wheelOptions = { passive: false };

function cycleWeapon(direction) {
  simState.currentWeapon =
    (simState.currentWeapon + direction + WEAPONS.length) % WEAPONS.length;
}

export function clearInput() {
  for (const action of new Set(Object.values(bindings))) {
    input[action] = false;
  }
  input.fire = false;
}

export function isMouseControlEnabled() {
  return settings.controlScheme === 'keyboardMouse';
}

// ------------------------------------------------------------
// module-level state: listeners attach once, but the pause
// callback is refreshed on every call so it never goes stale
// ------------------------------------------------------------

let listenersAttached = false;
let currentOnPause = null;
let handlers = null;

export function initializeInput(onPause) {
  // always point at the latest callback, even if already attached
  currentOnPause = onPause;

  if (listenersAttached) return disposeInput;

  function keyDown(e) {
    const key = e.code || e.key;
    const action = bindings[key];

    if (action) {
      input[action] = true;
    }

    if (e.repeat) return;

    if (e.code === 'KeyP') {
      currentOnPause?.();
      return;
    }

    if (e.code === 'KeyQ') {
      cycleWeapon(-1);
      return;
    }

    if (e.code === 'KeyE') {
      cycleWeapon(1);
      return;
    }

    if (action === 'deflect') {
      input.deflect = true;
      return;
    }

    const weaponIndex = weaponKeys[e.code];
    if (weaponIndex !== undefined && weaponIndex < WEAPONS.length) {
      simState.currentWeapon = weaponIndex;
    }
  }

  function keyUp(e) {
    const key = e.code || e.key;
    const action = bindings[key];
    if (action) {
      input[action] = false;
    }
  }

  function mouseMove(e) {
    input.mouseX = e.clientX;
    input.mouseY = e.clientY;
  }

  function mouseDown(e) {
    if (!isMouseControlEnabled()) return;
    if (e.button === 0) {
      input.fire = true;
    }
  }

  function mouseUp(e) {
    if (e.button === 0) {
      input.fire = false;
    }
  }

  function wheel(e) {
    e.preventDefault();
    if (e.deltaY > 0) {
      cycleWeapon(1);
    } else {
      cycleWeapon(-1);
    }
  }

  function onBlur() {
    clearInput();
  }

  function onVisibilityChange() {
    if (document.hidden) clearInput();
  }

  handlers = {
    keyDown, keyUp, mouseMove, mouseDown, mouseUp, wheel,
    onBlur, onVisibilityChange,
  };

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('mousemove', mouseMove);
  window.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);
  window.addEventListener('wheel', wheel, wheelOptions);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibilityChange);

  listenersAttached = true;

  return disposeInput;
}

export function disposeInput() {
  if (!listenersAttached || !handlers) return;

  window.removeEventListener('keydown', handlers.keyDown);
  window.removeEventListener('keyup', handlers.keyUp);
  window.removeEventListener('mousemove', handlers.mouseMove);
  window.removeEventListener('mousedown', handlers.mouseDown);
  window.removeEventListener('mouseup', handlers.mouseUp);
  window.removeEventListener('wheel', handlers.wheel, wheelOptions);
  window.removeEventListener('blur', handlers.onBlur);
  document.removeEventListener('visibilitychange', handlers.onVisibilityChange);

  handlers = null;
  listenersAttached = false;
  clearInput();
}

// tear down right before Vite swaps this module in dev, so a
// hot-reload of this file can't leave orphaned listeners behind
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeInput();
  });
}