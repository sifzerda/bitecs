// store/gameStore.js

import { create } from "zustand"
import { simState, resetSimState, resetSimStateForLevel } from "../src/state/simState.js"

export const SCREEN = {
  MENU: "menu",
  PLAY: "play",
  LEVEL_SELECT: "levelselect",
  GAME_OVER: "gameover",
  SETTINGS: "settings",
  HIGHSCORES: "highscores",
  HOW_TO_PLAY: "howtoplay",
  GUNS: "guns",
  LEVEL_COMPLETE: "levelcomplete",
}

/** Waves per zone: 3 asteroid + 1 boss */
export const WAVES_PER_ZONE = 4

/** Linear level → zone (1-based). Level 1–4 → zone 1, 5–8 → zone 2, … */
export function getZone(level) {
  return Math.ceil(level / WAVES_PER_ZONE)
}

/** Wave within zone (1–4). Wave 4 is always the boss. */
export function getWave(level) {
  return ((level - 1) % WAVES_PER_ZONE) + 1
}

export function isBossLevel(level) {
  return level > 0 && level % WAVES_PER_ZONE === 0
}

/** Boss roster index: zone 1 boss → 0, zone 2 boss → 1, … */
export function getBossIndex(level) {
  return Math.floor((level - 1) / WAVES_PER_ZONE)
}

/** Build linear level from zone + wave */
export function getLevelFromZoneWave(zone, wave) {
  return (zone - 1) * WAVES_PER_ZONE + wave
}

export function formatLevelLabel(level) {
  const zone = getZone(level)
  const wave = getWave(level)
  if (isBossLevel(level)) {
    return `ZONE ${zone} · WAVE ${wave} · BOSS`
  }
  return `ZONE ${zone} · WAVE ${wave}`
}

export const useGameStore = create((set, get) => ({
  screen: SCREEN.MENU,
  level: 1,
  highestLevelReached: 1,
  paused: false,

  resetRun: () => {
    resetSimState()
    set({
      screen: SCREEN.MENU,
      level: 1,
      paused: false,
    })
  },

  startLevel: (level = 1) => {
    resetSimStateForLevel()
    set({
      level,
      screen: SCREEN.PLAY,
      paused: false,
    })
  },

  resetProgress: () => {
    resetSimState()
    set({
      screen: SCREEN.MENU,
      level: 1,
      highestLevelReached: 1,
      paused: false,
    })
  },

  /** Boss died → level complete screen (does not advance level). */
  completeCurrentLevel: () => {
    const { level, highestLevelReached } = get()

    set({
      highestLevelReached: Math.max(highestLevelReached, level + 1),
      paused: true,
      screen: SCREEN.LEVEL_COMPLETE,
    })
  },

  /** Continue after level complete → next linear level. */
  advanceLevel: () => {
    const next = get().level + 1

    resetSimStateForLevel()

    set({
      level: next,
      highestLevelReached: Math.max(get().highestLevelReached, next),
      screen: SCREEN.PLAY,
      paused: false,
    })
  },

  /** Auto-advance after asteroid wave cleared (no UI). */
  advanceWave: () => {
    const next = get().level + 1

    resetSimStateForLevel()

    set({
      level: next,
      highestLevelReached: Math.max(get().highestLevelReached, next),
    })
  },

  gameOver: () =>
    set({
      screen: SCREEN.GAME_OVER,
      paused: true,
    }),

  setScreen: (screen) => set({ screen }),
  setPaused: (paused) => set({ paused }),
  togglePause: () => set((s) => ({ paused: !s.paused })),

  isLevelUnlocked: (level) => level <= get().highestLevelReached,
}))