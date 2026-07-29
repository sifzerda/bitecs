//src/state/uiState.js

import { useSyncExternalStore } from "react"

const listeners = new Set()

export function notifyUIChanged() {
    listeners.forEach(listener => listener())
}

function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

function snapshot() {
    return 0
}

export function useUIState() {
    return useSyncExternalStore(
        subscribe,
        snapshot
    )
}