// src/ecs/systems/settings.js

import { useSyncExternalStore } from "react"

const KEY = "asteroids.settings.v1"

export const DEFAULT_SETTINGS = Object.freeze({
  controlScheme: "keyboardMouse", bloom: true, quality: "medium", fps: false,
})

function sanitize(value = {}) {
  return {
    controlScheme: ["keyboard", "keyboardMouse"].includes(value.controlScheme) ? value.controlScheme : DEFAULT_SETTINGS.controlScheme,
    bloom: typeof value.bloom === "boolean" ? value.bloom : true,
    quality: ["low", "medium", "high"].includes(value.quality) ? value.quality : "medium",
    fps: typeof value.fps === "boolean" ? value.fps : false,
  }
}
function load() {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY)) ?? {}) }
  catch { return { ...DEFAULT_SETTINGS } }
}

let snapshot = Object.freeze(load())
// Preserve identity for existing imperative imports.

export const settings = { ...snapshot }

const listeners = new Set()

export function subscribeSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener)
}

export function getSettings() {
  return snapshot
}

export function useSettings() {
  return useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULT_SETTINGS)
}

export function saveSettings(patch) {

  const next = sanitize({ ...snapshot, ...patch })

  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  }
  catch {
    return false
  }

  Object.assign(settings, next)

  snapshot = Object.freeze(next)

  for (const listener of listeners) listener()
  return true
}

export function setControlScheme(controlScheme) {
  return saveSettings({ controlScheme })
}

export const QUALITY_DPR = { low: 1, medium: 1.5, high: 2 }
