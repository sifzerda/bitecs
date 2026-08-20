// store/gameStore.js

import { create } from "zustand"

import {
    simState,
    resetSimState,
    resetSimStateForLevel,
} from "../src/state/simState.js"

import {
    TOTAL_LEVELS,
    getProgression,
    isBossLevel,
    getZone,
    getWave,
    formatLevelLabel,
} from "../src/ecs/constants/progression.js"

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
}

// ============================================================
// PROGRESSION RE-EXPORTS
// ============================================================

export {
    TOTAL_LEVELS,
    getProgression,
    isBossLevel,
    getZone,
    getWave,
    formatLevelLabel,
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
    // IMPORTANT:
    // These persist when starting a NEW GAME.
    //
    // Only resetProgress() wipes them.
    // ========================================================

    unlockedWeapons: [0],

    pendingUnlockWeapon: null,

    // ========================================================
    // START LEVEL
    // ========================================================

    startLevel: (level = 1) => {

        const safeLevel = Math.max(
            1,
            Math.min(level, TOTAL_LEVELS)
        )

        resetSimStateForLevel()

        set({
            level: safeLevel,
            screen: SCREEN.PLAY,
            paused: false,

            // A level start consumes any old notification.
            pendingUnlockWeapon: null,
        })
    },

    // ========================================================
    // NEW GAME
    //
    // IMPORTANT:
    //
    // A NEW GAME resets the RUN:
    //
    // - score
    // - lives
    // - health
    // - level
    //
    // But it DOES NOT reset:
    //
    // - unlocked weapons
    // - highest level reached
    //
    // Those are campaign progression.
    // ========================================================

    resetRun: () => {

        resetSimState()

        set({
            screen: SCREEN.MENU,

            level: 1,

            paused: false,

            // IMPORTANT:
            // Do NOT reset unlockedWeapons here.
            //
            // Existing campaign unlocks survive
            // starting a new game.

            pendingUnlockWeapon: null,
        })
    },

    // ========================================================
    // RESET CAMPAIGN
    //
    // This is the TRUE FULL RESET.
    //
    // Used when you deliberately want to erase
    // all progression.
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
    // COMPLETE LEVEL
    // ========================================================

    completeLevel: () => {

        const {
            level,
            highestLevelReached,
        } = get()

        const nextLevel = Math.min(
            level + 1,
            TOTAL_LEVELS
        )

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
    // COMPLETE CURRENT LEVEL
    // ========================================================
    //
    // Kept for compatibility with any existing code.
    //
    // ========================================================

    completeCurrentLevel: () => {

        const {
            level,
            highestLevelReached,
        } = get()

        const nextLevel = Math.min(
            level + 1,
            TOTAL_LEVELS
        )

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
    // ========================================================

    continueLevel: () => {

        const currentLevel =
            get().level

        const nextLevel =
            currentLevel + 1

        // ----------------------------------------------------
        // CAMPAIGN COMPLETE
        // ----------------------------------------------------

        if (nextLevel > TOTAL_LEVELS) {

            set({
                screen: SCREEN.MENU,
                paused: false,
                pendingUnlockWeapon: null,
            })

            return
        }

        // ----------------------------------------------------
        // START NEXT LEVEL
        // ----------------------------------------------------

        resetSimStateForLevel()

        set((state) => ({

            level: nextLevel,

            highestLevelReached:
                Math.max(
                    state.highestLevelReached,
                    nextLevel
                ),

            screen: SCREEN.PLAY,

            paused: false,

            // Notification has been consumed.
            pendingUnlockWeapon: null,
        }))
    },

    // ========================================================
    // ADVANCE LEVEL
    //
    // Compatibility alias.
    //
    // Your old Home.jsx called advanceLevel().
    // This simply forwards to continueLevel().
    // ========================================================

    advanceLevel: () => {

        get().continueLevel()
    },

    // ========================================================
    // ADVANCE WAVE
    // ========================================================
    //
    // Currently equivalent to moving to the next level.
    //
    // ========================================================

    advanceWave: () => {

        const nextLevel =
            get().level + 1

        if (nextLevel > TOTAL_LEVELS) {
            return
        }

        resetSimStateForLevel()

        set((state) => ({

            level: nextLevel,

            highestLevelReached:
                Math.max(
                    state.highestLevelReached,
                    nextLevel
                ),

            screen: SCREEN.PLAY,

            paused: false,

            pendingUnlockWeapon: null,
        }))
    },

    // ========================================================
    // GAME OVER
    // ========================================================

    gameOver: () => {

        set({
            screen: SCREEN.GAME_OVER,
            paused: true,
        })
    },

    // ========================================================
    // UNLOCK WEAPON
    // ========================================================
    //
    // IMPORTANT:
    //
    // If weapon is already unlocked:
    //
    //     DO NOTHING
    //
    // Therefore defeating the same boss again will NOT
    // show "NEW WEAPON UNLOCKED".
    //
    // If weapon is genuinely new:
    //
    //     add it to unlockedWeapons
    //     set pendingUnlockWeapon
    //
    // ========================================================

    unlockWeapon: (weaponId) => {

        if (weaponId == null) {
            return
        }

        set((state) => {

            const alreadyUnlocked =
                state.unlockedWeapons.includes(
                    weaponId
                )

            // ------------------------------------------------
            // ALREADY UNLOCKED
            // ------------------------------------------------
            //
            // Do not generate another unlock notification.
            //

            if (alreadyUnlocked) {

                return {
                    unlockedWeapons:
                        state.unlockedWeapons,

                    pendingUnlockWeapon:
                        null,
                }
            }

            // ------------------------------------------------
            // NEW WEAPON
            // ------------------------------------------------

            return {

                unlockedWeapons: [
                    ...state.unlockedWeapons,
                    weaponId,
                ],

                pendingUnlockWeapon:
                    weaponId,
            }
        })
    },

    // ========================================================
    // CLEAR PENDING UNLOCK
    // ========================================================

    clearPendingUnlockWeapon: () => {

        set({
            pendingUnlockWeapon: null,
        })
    },

    // ========================================================
    // UI
    // ========================================================

    setScreen: (screen) =>
        set({ screen }),

    setPaused: (paused) =>
        set({ paused }),

    togglePause: () =>
        set((state) => ({
            paused: !state.paused,
        })),

    // ========================================================
    // LEVEL ACCESS
    // ========================================================

    isLevelUnlocked: (level) =>
        level >= 1 &&
        level <= get().highestLevelReached,

}))