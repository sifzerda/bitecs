// src/ecs/systems/input.js

import { simState } from "../../state/simState.js"
import { WEAPONS } from "../weapons/config/weapons.js"
import { settings } from "../systems/settings.js"

// Debug weapon switching: dev server only, never in production builds.
const DEBUG_WEAPON_SWITCH = import.meta.env.DEV

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
}

export const mouse = input

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
}

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
}

const wheelOptions = { passive: false }

function cycleWeapon(direction) {
  simState.currentWeapon = (simState.currentWeapon + direction + WEAPONS.length) % WEAPONS.length
}

export function clearInput() {
  for (const action of new Set(Object.values(bindings))) {
    input[action] = false
  }

  input.fire = false
  input.deflect = false
}

export function isMouseControlEnabled() {
  return settings.controlScheme === 'keyboardMouse'
}

// ------------------------------------------------------------
// MODULE STATE
// ------------------------------------------------------------

let listenersAttached = false
let currentOnPause = null
let handlers = null

// ------------------------------------------------------------
// INITIALIZE INPUT
// ------------------------------------------------------------

export function initializeInput(onPause) {
  // Always refresh the latest pause callback.
  currentOnPause = onPause

  if (listenersAttached) return disposeInput

  // ----------------------------------------------------------
  // KEYBOARD
  // ----------------------------------------------------------

  function keyDown(e) {
    const key = e.code || e.key
    const action = bindings[key]

    if (action) {
      input[action] = true
    }

    if (e.repeat) return

    if (e.code === 'KeyP') {
      currentOnPause?.()
      return
    }

    if (!DEBUG_WEAPON_SWITCH) return

    if (e.code === 'KeyQ') {
      cycleWeapon(-1)
      return
    }

    if (e.code === 'KeyE') {
      cycleWeapon(1)
      return
    }

    const weaponIndex = weaponKeys[e.code]

    if (weaponIndex !== undefined && weaponIndex < WEAPONS.length) {
      simState.currentWeapon = weaponIndex
    }
  }

  function keyUp(e) {
    const key = e.code || e.key
    const action = bindings[key]

    if (action) {
      input[action] = false
    }
  }

  // ----------------------------------------------------------
  // MOUSE
  // ----------------------------------------------------------

  function mouseMove(e) {
    input.mouseX = e.clientX
    input.mouseY = e.clientY
  }

  function mouseDown(e) {
    if (!isMouseControlEnabled()) return

    // Right mouse button = deflect
    if (e.button === 2) {
      e.preventDefault()
      input.deflect = true
      return
    }

    // Left mouse button = fire
    if (e.button === 0) {
      input.fire = true
    }
  }

  function mouseUp(e) {
    if (e.button === 2) {
      input.deflect = false
      return
    }

    if (e.button === 0) {
      input.fire = false
    }
  }

  // ----------------------------------------------------------
  // PREVENT BROWSER CONTEXT MENU
  // ----------------------------------------------------------

  function contextMenu(e) {
    if (isMouseControlEnabled()) {
      e.preventDefault()
    }
  }

  // ----------------------------------------------------------
  // MOUSE WHEEL = WEAPON SWITCHING
  // ----------------------------------------------------------

  function wheel(e) {
    e.preventDefault()

    if (e.deltaY > 0) {
      cycleWeapon(1)
    } else {
      cycleWeapon(-1)
    }
  }

  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------

  function onBlur() {
    clearInput()
  }

  function onVisibilityChange() {
    if (document.hidden) {
      clearInput()
    }
  }

  // ----------------------------------------------------------
  // EVENT HANDLERS
  // ----------------------------------------------------------

  handlers = { keyDown, keyUp, mouseMove, mouseDown, mouseUp, contextMenu, wheel, onBlur, onVisibilityChange }

  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('mousemove', mouseMove)
  window.addEventListener('mousedown', mouseDown)
  window.addEventListener('mouseup', mouseUp)
  window.addEventListener('contextmenu', contextMenu)
  if (DEBUG_WEAPON_SWITCH) {
    window.addEventListener('wheel', wheel, wheelOptions)
  }
  window.addEventListener('blur', onBlur)
  
  document.addEventListener('visibilitychange', onVisibilityChange)

  listenersAttached = true

  return disposeInput
}

// ------------------------------------------------------------
// DISPOSE INPUT
// ------------------------------------------------------------

export function disposeInput() {
  if (!listenersAttached || !handlers) return

  window.removeEventListener('keydown', handlers.keyDown)
  window.removeEventListener('keyup', handlers.keyUp)
  window.removeEventListener('mousemove', handlers.mouseMove)
  window.removeEventListener('mousedown', handlers.mouseDown)
  window.removeEventListener('mouseup', handlers.mouseUp)
  window.removeEventListener('contextmenu', handlers.contextMenu)
  window.removeEventListener('wheel', handlers.wheel, wheelOptions)
  window.removeEventListener('blur', handlers.onBlur)

  document.removeEventListener('visibilitychange', handlers.onVisibilityChange)

  handlers = null
  listenersAttached = false

  clearInput()
}

// ------------------------------------------------------------
// VITE HOT MODULE REPLACEMENT
// ------------------------------------------------------------

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeInput()
  })
}
