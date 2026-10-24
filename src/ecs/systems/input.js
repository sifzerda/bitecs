// src/ecs/systems/input.js

import { startState } from "../../state/startState.js"
import { WEAPONS } from "../weapons/config/weapons.js"
import { settings } from "./settings.js"

import { useGameStore, SCREEN } from "../../../store/gameStore.js"

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

const ACTION_KEYS = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  thrust: ["ArrowUp", "KeyW"],
  brake: ["ArrowDown", "KeyS"],
  fire: ["Space"],
}

const GAME_KEYS = new Set([
  ...Object.values(ACTION_KEYS).flat(),
  "KeyX",
])

const WEAPON_KEYS = {
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

const heldKeys = new Set()

let mouseFire = false
let cleanup = null

function isPlaying() {
  const { screen, paused } = useGameStore.getState()

  return screen === SCREEN.PLAY && !paused
}

function isEditable(target) {
  return (
    target instanceof Element && (target.closest("input, textarea, select, [contenteditable]") !== null)
  )
}

function syncActions() {
  for (const [action, codes] of Object.entries(ACTION_KEYS)) {
    input[action] = codes.some(
      code => heldKeys.has(code)
    )
  }

  input.fire ||= mouseFire
}

export function clearInput() {
  heldKeys.clear()
  mouseFire = false

  input.left = false
  input.right = false
  input.thrust = false
  input.brake = false
  input.fire = false
  input.deflect = false
}

export function isMouseControlEnabled() {
  return settings.controlScheme === "keyboardMouse"
}

function cycleWeapon(direction) {
  if (WEAPONS.length === 0) return

  startState.currentWeapon = (startState.currentWeapon + direction + WEAPONS.length) % WEAPONS.length
}

export function initializeInput(onPause) {
  disposeInput()

  function keyDown(event) {
    if (isEditable(event.target)) return

    const code = event.code || event.key
    const { screen } = useGameStore.getState()

    if (
      (code === "KeyP" || code === "Escape") && screen === SCREEN.PLAY) {
      event.preventDefault()

      if (!event.repeat) {
        clearInput()
        onPause?.()
      }

      return
    }

    if (!isPlaying()) return

    if (GAME_KEYS.has(code)) {
      event.preventDefault()

      if (code === "KeyX") {
        if (!event.repeat) {
          input.deflect = true
        }
      } else {
        heldKeys.add(code)
        syncActions()
      }

      return
    }

    if (!DEBUG_WEAPON_SWITCH || event.repeat) {
      return
    }

    if (code === "KeyQ") {
      cycleWeapon(-1)
    } else if (code === "KeyE") {
      cycleWeapon(1)
    } else {
      const index = WEAPON_KEYS[code]

      if (index !== undefined && index < WEAPONS.length) {
        startState.currentWeapon = index
      }
    }
  }

  function keyUp(event) {
    heldKeys.delete(event.code || event.key)
    syncActions()
  }

  function mouseMove(event) {
    input.mouseX = event.clientX
    input.mouseY = event.clientY
  }

  function mouseDown(event) {
    if (!isPlaying() || !isMouseControlEnabled() || isEditable(event.target)) {
      return
    }

    // Ignore HUD buttons and other page controls.
    if (!(event.target instanceof Element) || event.target.tagName !== "CANVAS") {
      return
    }

    if (event.button === 0) {
      mouseFire = true
      syncActions()
    } else if (event.button === 2) {
      event.preventDefault()
      input.deflect = true
    }
  }

  function mouseUp(event) {
    if (event.button === 0) {
      mouseFire = false
      syncActions()
    }
  }

  function contextMenu(event) {
    if (isPlaying() && isMouseControlEnabled() && event.target instanceof Element && event.target.tagName === "CANVAS") {
      event.preventDefault()
    }
  }

  function wheel(event) {
    if (!DEBUG_WEAPON_SWITCH || !isPlaying() || event.deltaY === 0 || !(event.target instanceof Element) || event.target.tagName !== "CANVAS") {
      return
    }

    event.preventDefault()

    cycleWeapon(event.deltaY > 0 ? 1 : -1)
  }

  function onBlur() {
    clearInput()

    const state = useGameStore.getState()

    if (state.screen === SCREEN.PLAY && !state.paused) {
      state.setPaused(true)
    }
  }

  function visibilityChange() {
    if (document.hidden) onBlur()
  }

  const unsubscribe = useGameStore.subscribe(
    (state, previous) => {
      if (state.screen !== previous.screen || state.paused !== previous.paused) {
        clearInput()
      }
    }
  )

  window.addEventListener("keydown", keyDown)
  window.addEventListener("keyup", keyUp)
  window.addEventListener("mousemove", mouseMove)
  window.addEventListener("mousedown", mouseDown)
  window.addEventListener("mouseup", mouseUp)
  window.addEventListener("contextmenu", contextMenu)
  window.addEventListener("blur", onBlur)

  window.addEventListener("wheel", wheel, { passive: false })

  document.addEventListener("visibilitychange", visibilityChange)

  cleanup = () => {
    window.removeEventListener("keydown", keyDown)
    window.removeEventListener("keyup", keyUp)
    window.removeEventListener("mousemove", mouseMove)
    window.removeEventListener("mousedown", mouseDown)
    window.removeEventListener("mouseup", mouseUp)
    window.removeEventListener("contextmenu", contextMenu)
    window.removeEventListener("blur", onBlur)
    window.removeEventListener("wheel", wheel)

    document.removeEventListener("visibilitychange", visibilityChange)

    unsubscribe()
    clearInput()
  }

  return disposeInput
}

export function disposeInput() {
  const dispose = cleanup
  cleanup = null
  dispose?.()
}

if (import.meta.hot) {
  import.meta.hot.dispose(disposeInput)
}