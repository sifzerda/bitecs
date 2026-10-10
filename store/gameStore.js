// store/gameStore.js

import { create } from "zustand"
import { resetSimState, resetSimStateForLevel } from "../src/state/simState.js"
import { TOTAL_LEVELS, getProgression, isBossLevel, getZone, getWave, getBossKey, formatLevelLabel } from "../src/ecs/constants/progression.js"
import { resetLevelWorld } from "../src/state/resetLevel.js"
import { resetWaveSystem } from "../src/ecs/systems/waveSystem.js"

// ============================================================
// SCREEN
// ============================================================

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

    DEBUG: "debug",
}

// ============================================================
// PROGRESSION RE-EXPORTS
//
// Existing components can continue importing these from
// gameStore.js.
// ============================================================

export {
    TOTAL_LEVELS,
    getProgression,
    isBossLevel,
    getZone,
    getWave,
    getBossKey,
    formatLevelLabel,
}

// ============================================================
// HELPERS
// ============================================================

function clampLevel(level) {
    return Math.max(1, Math.min(Number(level) || 1, TOTAL_LEVELS))
}

// ============================================================
// GAME STORE
// ============================================================

export const useGameStore = create((set, get) => ({

    // ========================================================
    // CORE GAME STATE
    // ========================================================

    screen: SCREEN.MENU,
    level: 1,
    highestLevelReached: 1,
    paused: false,

    // ========================================================
    // WEAPON / CAMPAIGN STATE
    //
    // These survive starting a new game.
    // ========================================================

    unlockedWeapons: [0],
    pendingUnlockWeapon: null,

    // ========================================================
    // START LEVEL
    //
    // Used by level select and starting a specific level.
    // ========================================================

    startLevel: (level = 1) => {
        const safeLevel = clampLevel(level)

        resetWaveSystem()
        resetLevelWorld()
        resetSimStateForLevel()

        set({
            level: safeLevel,
            screen: SCREEN.PLAY,
            paused: false,
            pendingUnlockWeapon: null,
        })
    },

    // ========================================================
    // NEW GAME
    //
    // Resets the current run.
    //
    // Does NOT erase campaign progression.
    // ========================================================

    resetRun: () => {

        resetSimState()

        set({
            screen: SCREEN.MENU,
            level: 1,
            paused: false,
            pendingUnlockWeapon: null,
            // IMPORTANT:
            // unlockedWeapons remains unchanged.
            // highestLevelReached remains unchanged.
        })
    },

    // ========================================================
    // RESET CAMPAIGN
    //
    // Completely wipes progression.
    // ========================================================

    resetProgress: () => {

        resetSimState()

        set({

            screen: SCREEN.MENU,
            level: 1,
            highestLevelReached: 1,
            paused: false,
            unlockedWeapons: [0],
            pendingUnlockWeapon: null,
        })
    },

    // ========================================================
    // COMPLETE CURRENT ENCOUNTER
    //
    // Called when:
    //
    //   - final asteroid dies
    //   - boss dies
    //
    // IMPORTANT:
    //
    // This does NOT increment the level.
    //
    // It takes the player to LEVEL_COMPLETE.
    // The player decides when to continue.
    // ========================================================

    completeLevel: () => {
        const { level, highestLevelReached, screen } = get()

        // Prevent duplicate completion events.
        if (screen !== SCREEN.PLAY) return

        resetLevelWorld()

        const nextLevel = Math.min(level + 1, TOTAL_LEVELS)

        set({
            highestLevelReached: Math.max(
                highestLevelReached,
                nextLevel
            ),
            paused: true,
            screen: SCREEN.LEVEL_COMPLETE,
        })
    },

    // ========================================================
    // CONTINUE
    //
    // Called by LevelCompleteScreen.
    //
    // This is the ONLY place that advances level.
    // ========================================================

    continueLevel: () => {
        const state = get()

        // Continue is valid only from the completion screen.
        if (state.screen !== SCREEN.LEVEL_COMPLETE) return

        const nextLevel = state.level + 1

        if (nextLevel > TOTAL_LEVELS) {
            set({
                screen: SCREEN.MENU,
                paused: false,
                pendingUnlockWeapon: null,
            })
            return
        }

        // Start from a completely reset simulation.
        resetWaveSystem()
        resetLevelWorld()
        resetSimStateForLevel()

        set({
            level: nextLevel,
            highestLevelReached: Math.max(state.highestLevelReached, nextLevel),
            screen: SCREEN.PLAY,
            paused: false,
            pendingUnlockWeapon: null,
        });
    },

    // ========================================================
    // GAME OVER
    // ========================================================

    gameOver: () => {
        set({ screen: SCREEN.GAME_OVER, paused: true })
    },

    // ========================================================
    // UNLOCK WEAPON
    // ========================================================

    unlockWeapon: (weaponId) => {

        if (weaponId == null) {
            return false
        }

        let newlyUnlocked = false

        set(state => {

            const alreadyUnlocked = state.unlockedWeapons.includes(weaponId)

            if (alreadyUnlocked) {

                return {
                    unlockedWeapons: state.unlockedWeapons,
                    pendingUnlockWeapon: null,
                }
            }
            newlyUnlocked = true

            return {
                unlockedWeapons: [...state.unlockedWeapons, weaponId],
                pendingUnlockWeapon: weaponId,
            }
        })

        return newlyUnlocked
    },


    // ========================================================
    // CLEAR PENDING WEAPON
    // ========================================================

    clearPendingUnlockWeapon: () => { set({ pendingUnlockWeapon: null }) },

    // ========================================================
    // UI
    // ========================================================

    setScreen: (screen) => set({ screen }),
    setPaused: (paused) => set({ paused }),
    togglePause: () => set(state => ({ paused: !state.paused })),

    // ========================================================
    // LEVEL ACCESS
    // ========================================================

    isLevelUnlocked: (level) => {
        const safeLevel = Number(level)
        return (safeLevel >= 1 && safeLevel <= get().highestLevelReached)
    },

}))