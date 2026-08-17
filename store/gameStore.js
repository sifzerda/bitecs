// store/gameStore.js

import { create } from "zustand"

import {
    simState,
    resetSimState,
    resetSimStateForLevel,
    resetSimStateForAdvance,
} from "../src/state/simState.js"


// ============================================================
// SCREENS
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
    STAGE_COMPLETE: "stagecomplete",
}


// ============================================================
// LEVEL SECTIONS
// ============================================================

export const LEVEL_SECTION = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
}

export const LEVELS_PER_STAGE = 5


// ============================================================
// LEVEL HELPERS
// ============================================================

// Stage 1 A = 1
// Stage 1 B = 2
// Stage 1 C = 3
// Stage 1 D = 4
// Stage 1 E = 5
// Stage 2 A = 6
// etc.

export function getLevelIndex(stage, section) {
    return (stage - 1) * LEVELS_PER_STAGE + section
}


export function getLevelId(stage, section) {
    const sectionLetter = String.fromCharCode(
        64 + section
    )

    return `${stage}.${sectionLetter}`
}


// ============================================================
// STORE
// ============================================================

export const useGameStore = create((set, get) => ({

    // --------------------------------------------------------
    // Navigation state
    // --------------------------------------------------------

    screen: SCREEN.MENU,
    stage: 1,
    section: LEVEL_SECTION.A,
    highestLevelReached: 1,
    paused: false,


    // ========================================================
    // START LEVEL
    // ========================================================

    startLevel: (stage, section) => {

        resetSimStateForLevel(section)

        set({
            stage,
            section,
            screen: SCREEN.PLAY,
            paused: false,
        })
    },


    // ========================================================
    // NEW RUN
    // ========================================================

    resetRun: () => {

        resetSimState()

        set({
            screen: SCREEN.MENU,
            stage: 1,
            section: LEVEL_SECTION.A,
            highestLevelReached: 1,
            paused: false,
        })
    },


    // ========================================================
    // COMPLETE CURRENT LEVEL
    // ========================================================
    //
    // Called when the boss dies.
    //
    // IMPORTANT:
    // This does NOT advance the player.
    //
    // It only unlocks the next level and puts the game into
    // STAGE_COMPLETE.
    //
    // ========================================================

    completeCurrentLevel: () => {

        const {
            stage,
            section,
            highestLevelReached,
        } = get()

        const nextLevel =
            getLevelIndex(stage, section) + 1

        set({
            highestLevelReached: Math.max(
                highestLevelReached,
                nextLevel
            ),

            paused: true,

            screen: SCREEN.STAGE_COMPLETE,
        })
    },


    // ========================================================
    // ADVANCE TO NEXT LEVEL
    // ========================================================
    //
    // This is the ONLY action that actually changes the
    // current level after completion.
    //
    // ========================================================

    advanceLevel: () => {

        const {
            stage,
            section,
        } = get()

        let nextStage = stage
        let nextSection = section + 1

        if (nextSection > LEVELS_PER_STAGE) {
            nextSection = LEVEL_SECTION.A
            nextStage += 1
        }

        const nextLevel =
            getLevelIndex(nextStage, nextSection)

        resetSimStateForAdvance()

        set({
            stage: nextStage,
            section: nextSection,

            highestLevelReached: Math.max(
                get().highestLevelReached,
                nextLevel
            ),

            screen: SCREEN.PLAY,
            paused: false,
        })
    },

    // ========================================================
    // Game Over
    // ========================================================

    gameOver: () => set({
        screen: SCREEN.GAME_OVER,
        paused: true,
    }),


    // ========================================================
    // NAVIGATION
    // ========================================================

    setScreen: (screen) => set({
        screen,
    }),


    setPaused: (paused) => set({
        paused,
    }),


    togglePause: () => {
        set((state) => ({
            paused: !state.paused,
        }))
    },


    // ========================================================
    // LEVEL UNLOCKING
    // ========================================================

    isLevelUnlocked: (stage, section) => {

        const level =
            getLevelIndex(stage, section)

        return level <= get().highestLevelReached
    },
}))