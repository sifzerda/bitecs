//src/state/uiState.js

import { useSyncExternalStore } from "react"

const listeners = new Set()

let version = 0

export function notifyUIChanged() {
    version++
    listeners.forEach(listener => listener())
}

function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

function snapshot() {
    return version
}

export function useUIState() {
    return useSyncExternalStore(
        subscribe,
        snapshot
    )
}