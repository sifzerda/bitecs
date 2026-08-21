// src/screens/LevelSelectScreen.jsx

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  useGameStore,
  SCREEN,
  isBossLevel,
  getWave,
  formatLevelLabel,
} from "../../store/gameStore.js"

import FlightLayout2 from "../components/FlightLayout2.jsx"

import {
  ZONES,
  ENCOUNTERS_PER_ZONE,
  TOTAL_LEVELS,
} from "../ecs/constants/progression.js"

// ============================================================
// HELPERS
// ============================================================

function levelLabel(level) {

  if (isBossLevel(level)) {
    return "BOSS"
  }

  return `WAVE ${getWave(level)}`
}

function levelSubLabel(level) {

  return isBossLevel(level)
    ? "BOSS // CORE"
    : "ASTEROID FIELD"
}

// ============================================================
// STAGE ICON
// ============================================================

function StageIcon({
  boss,
  locked,
  active,
}) {

  if (locked) {

    return (
      <div className="text-2xl text-white/20">
        🔒
      </div>
    )
  }

  if (boss) {

    return (
      <div
        className={`
          relative flex h-10 w-10
          rotate-45 items-center justify-center
          border-2

          ${
            active
              ? `
                border-yellow-300
                bg-yellow-400/10
                shadow-[0_0_24px_rgba(255,220,50,0.6)]
              `
              : `
                border-yellow-400/60
                bg-yellow-400/5
              `
          }
        `}
      >
        <span className="-rotate-45 text-lg text-yellow-300">
          ☠
        </span>
      </div>
    )
  }

  return (
    <div
      className={`
        relative flex h-10 w-10
        items-center justify-center
        rounded-full border-2

        ${
          active
            ? `
              border-cyan-300
              bg-cyan-400/10
              shadow-[0_0_22px_rgba(0,255,255,0.55)]
            `
            : `
              border-[#39ff14]/50
              bg-[#39ff14]/5
            `
        }
      `}
    >
      <div className="h-3.5 w-3.5 rounded-full border border-current" />

      <div className="absolute h-6 w-px bg-current/60" />

      <div className="absolute h-px w-6 bg-current/60" />
    </div>
  )
}

// ============================================================
// CORNER BRACKETS
// ============================================================

function CornerBrackets() {

  return (
    <>
      <div className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-cyan-400/70" />

      <div className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-cyan-400/70" />

      <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-cyan-400/70" />

      <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-cyan-400/70" />
    </>
  )
}

// ============================================================
// LEVEL SELECT SCREEN
// ============================================================

export default function LevelSelectScreen({
  onPlay,
  onBack,
}) {

  // ==========================================================
  // GAME STORE
  // ==========================================================

  const highestLevelReached = useGameStore(
    (state) => state.highestLevelReached
  )

  const isLevelUnlocked = useGameStore(
    (state) => state.isLevelUnlocked
  )

  const startLevel = useGameStore(
    (state) => state.startLevel
  )

  // ==========================================================
  // PROGRESSION
  //
  // IMPORTANT:
  //
  // A zone contains:
  //
  //   3 asteroid waves
  //   1 boss
  //
  // Therefore each zone occupies 4 LEVELS.
  //
  // ZONE 1 = 1 - 4
  // ZONE 2 = 5 - 8
  // ZONE 3 = 9 - 12
  // ZONE 4 = 13 - 16
  // ==========================================================

  const totalLevels = TOTAL_LEVELS
  const zoneCount = ZONES.length

  // ==========================================================
  // SAFE HIGHEST LEVEL
  // ==========================================================

  const safeHighestLevel = useMemo(() => {

    return Math.max(
      1,
      Math.min(
        Number(highestLevelReached) || 1,
        totalLevels
      )
    )

  }, [
    highestLevelReached,
    totalLevels,
  ])

  // ==========================================================
  // SELECTED LEVEL
  // ==========================================================

  const [selected, setSelected] = useState(
    safeHighestLevel
  )

  // ==========================================================
  // KEEP SELECTION VALID
  // ==========================================================

  useEffect(() => {

    setSelected((previous) => {

      const clamped = Math.max(
        1,
        Math.min(
          Number(previous) || 1,
          totalLevels
        )
      )

      if (
        isLevelUnlocked(clamped)
      ) {
        return clamped
      }

      return safeHighestLevel
    })

  }, [
    totalLevels,
    safeHighestLevel,
    isLevelUnlocked,
  ])

  // ==========================================================
  // SELECT LEVEL
  // ==========================================================

  const select = useCallback(
    (level) => {

      if (
        level < 1 ||
        level > totalLevels
      ) {
        return
      }

      if (
        !isLevelUnlocked(level)
      ) {
        return
      }

      setSelected(level)
    },
    [
      isLevelUnlocked,
      totalLevels,
    ]
  )

  // ==========================================================
  // PLAY
  // ==========================================================

  const play = useCallback(() => {

    if (
      selected < 1 ||
      selected > totalLevels
    ) {
      return
    }

    if (
      !isLevelUnlocked(selected)
    ) {
      return
    }

    startLevel(selected)

    onPlay?.(selected)

  }, [
    selected,
    totalLevels,
    isLevelUnlocked,
    startLevel,
    onPlay,
  ])

  // ==========================================================
  // BACK
  // ==========================================================

  const back = useCallback(() => {

    if (onBack) {
      onBack()
      return
    }

    useGameStore.setState({
      screen: SCREEN.MENU,
      paused: false,
    })

  }, [onBack])

  // ==========================================================
  // KEYBOARD
  // ==========================================================

  useEffect(() => {

    const onKey = (event) => {

      if (
        event.key === "Escape" ||
        event.key === "Backspace"
      ) {

        event.preventDefault()

        back()

        return
      }

      if (
        event.key === "Enter"
      ) {

        event.preventDefault()

        play()
      }
    }

    window.addEventListener(
      "keydown",
      onKey
    )

    return () => {

      window.removeEventListener(
        "keydown",
        onKey
      )
    }

  }, [
    back,
    play,
  ])

  // ==========================================================
  // SELECTED LEVEL STATE
  // ==========================================================

  const selectedUnlocked =
    isLevelUnlocked(selected)

  const selectedIsBoss =
    isBossLevel(selected)

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <FlightLayout2
      title="LEVEL SELECT"
      footer={`REACHED: ${formatLevelLabel(safeHighestLevel)}`}
      size="2xl"
      centered={false}
      scrollable
    >

      <div className="mx-auto w-full max-w-5xl pb-22 font-mono">

        {/* ====================================================
            TOP STATUS BAR
        ==================================================== */}

        <div className="
          mb-6 flex flex-wrap
          items-center gap-x-6 gap-y-2
          border-y border-cyan-400/20
          bg-black/50
          px-4 py-3
          text-[9px]
          tracking-[0.3em]
        ">

          {/* SECTOR MAP */}

          <div className="flex items-center gap-3">

            <span className="text-cyan-300">
              SECTOR MAP
            </span>

            <span className="
              h-2 w-2
              animate-pulse
              rounded-full
              bg-cyan-400
              shadow-[0_0_8px_#00ffff]
            " />

          </div>

          {/* PROGRESS */}

          <div className="text-[#39ff14]/60">

            PROGRESS

            <span className="ml-2 text-[#39ff14]">
              {safeHighestLevel}/{totalLevels}
            </span>

          </div>

          {/* SELECTED MISSION */}

          <div className="flex items-center gap-2">

            <span className="text-white/30">
              MISSION
            </span>

            <span className="
              text-cyan-300
              drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]
            ">
              {formatLevelLabel(selected)}
            </span>

          </div>

          {/* ACCESS */}

          <div
            className={
              selectedUnlocked
                ? "text-[#39ff14]"
                : "text-red-400/60"
            }
          >

            {selectedUnlocked
              ? selectedIsBoss
                ? "BOSS READY"
                : "READY"
              : "ACCESS DENIED"}

          </div>

          {/* ACTIONS */}

          <div className="
            ml-auto
            flex items-center gap-2
          ">

            <button
              type="button"
              onClick={back}
              className="
                border
                border-[#39ff14]/40
                bg-black/50
                px-4 py-2
                text-[9px]
                font-bold
                tracking-[0.3em]
                text-[#39ff14]/70
                transition-all

                hover:border-[#39ff14]
                hover:bg-[#39ff14]/6
                hover:text-[#39ff14]
              "
            >
              BACK
            </button>

            <button
              type="button"
              onClick={play}
              disabled={!selectedUnlocked}
              className="
                group relative
                overflow-hidden
                border-2
                border-cyan-300
                bg-cyan-400/8
                px-4 py-2
                text-[9px]
                font-bold
                tracking-[0.3em]
                text-cyan-300
                shadow-[0_0_12px_rgba(0,255,255,0.15)]
                transition-all

                hover:bg-cyan-400/18
                hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]

                disabled:cursor-not-allowed
                disabled:border-white/10
                disabled:text-white/20
                disabled:shadow-none
              "
            >

              <span className="relative z-10">
                ▶ PLAY
              </span>

              <div className="
                absolute
                inset-y-0
                -left-full
                w-1/2
                skew-x-[-20deg]
                bg-white/10
                transition-all
                duration-500
                group-hover:left-[120%]
              " />

            </button>

          </div>

        </div>

        {/* ====================================================
            ZONES
        ==================================================== */}

        {Array.from({
          length: zoneCount,
        }).map((_, zoneIndex) => {

          const zoneNumber =
            zoneIndex + 1

          // IMPORTANT:
          //
          // Use ENCOUNTERS_PER_ZONE here.
          //
          // WAVES_PER_ZONE = 3
          // ENCOUNTERS_PER_ZONE = 4
          //
          // This means:
          //
          // Zone 1 → levels 1-4
          // Zone 2 → levels 5-8
          // Zone 3 → levels 9-12
          // Zone 4 → levels 13-16

          const base =
            zoneIndex *
            ENCOUNTERS_PER_ZONE

          const firstLevel =
            base + 1

          const lastLevel =
            Math.min(
              base + ENCOUNTERS_PER_ZONE,
              totalLevels
            )

          const zoneUnlocked =
            firstLevel <= totalLevels &&
            isLevelUnlocked(firstLevel)

          const zoneReached =
            safeHighestLevel >= firstLevel

          return (
            <section
              key={zoneNumber}
              className="relative mb-10"
            >

              {/* ==================================================
                  ZONE HEADER
              ================================================== */}

              <div className="
                mb-4
                flex items-center gap-4
              ">

                <div className="
                  flex items-center gap-3
                  text-[11px]
                  font-bold
                  tracking-[0.35em]
                ">

                  <span className="
                    text-cyan-300
                    drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]
                  ">
                    ZONE {String(zoneNumber).padStart(2, "0")}
                  </span>

                  <span className="text-white/20">
                    //
                  </span>

                  <span
                    className={
                      zoneReached
                        ? "text-[#39ff14]/70"
                        : "text-white/20"
                    }
                  >
                    {zoneReached
                      ? "SECTOR ACTIVE"
                      : "SECTOR LOCKED"}
                  </span>

                </div>

                <div className="
                  h-px
                  flex-1
                  bg-linear-to-r
                  from-cyan-400/30
                  to-transparent
                " />

              </div>

              {/* ==================================================
                  STAGE MAP
              ================================================== */}

              <div className="
                relative
                grid
                grid-cols-3
                gap-2
                sm:grid-cols-4
              ">

                {/* CONNECTING ROUTE */}

                <div className="
                  pointer-events-none
                  absolute
                  left-[12%]
                  right-[12%]
                  top-1/2
                  hidden
                  h-px
                  -translate-y-1/2
                  bg-linear-to-r
                  from-[#39ff14]/20
                  via-cyan-400/50
                  to-yellow-400/30
                  sm:block
                " />

                {/* LEVELS */}

                {Array.from({
                  length:
                    lastLevel - base,
                }).map((_, levelIndex) => {

                  const level =
                    base +
                    levelIndex +
                    1

                  const unlocked =
                    isLevelUnlocked(level)

                  const active =
                    selected === level

                  const boss =
                    isBossLevel(level)

                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => select(level)}
                      aria-label={
                        unlocked
                          ? `Select ${formatLevelLabel(level)}`
                          : `${formatLevelLabel(level)} locked`
                      }
                      className={`
                        group
                        relative
                        h-24
                        overflow-hidden
                        border
                        text-left
                        transition-all
                        duration-200

                        ${
                          active && unlocked

                            ? boss

                              ? `
                                border-yellow-300
                                bg-yellow-400/8
                                shadow-[0_0_30px_rgba(255,220,50,0.25)]
                              `

                              : `
                                border-cyan-300
                                bg-cyan-400/8
                                shadow-[0_0_30px_rgba(0,255,255,0.25)]
                              `

                            : unlocked

                              ? boss

                                ? `
                                  border-yellow-400/40
                                  bg-black/70
                                  hover:border-yellow-300
                                  hover:bg-yellow-400/6
                                `

                                : `
                                  border-[#39ff14]/30
                                  bg-black/70
                                  hover:border-cyan-300/70
                                  hover:bg-cyan-400/4
                                `

                              : `
                                cursor-not-allowed
                                border-white/6
                                bg-black/80
                              `
                        }
                      `}
                    >

                      <CornerBrackets />

                      {/* SCANLINES */}

                      <div className="
                        pointer-events-none
                        absolute inset-0
                        opacity-20
                        bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.04)_51%)]
                        bg-size-[100%_4px]
                      " />

                      {/* ACTIVE GLOW */}

                      {active && unlocked && (

                        <div
                          className={`
                            pointer-events-none
                            absolute inset-0

                            ${
                              boss
                                ? `
                                  bg-[radial-gradient(
                                    circle_at_center,
                                    rgba(255,220,50,0.14),
                                    transparent_65%
                                  )]
                                `
                                : `
                                  bg-[radial-gradient(
                                    circle_at_center,
                                    rgba(0,255,255,0.14),
                                    transparent_65%
                                  )]
                                `
                            }
                          `}
                        />

                      )}

                      {/* CONTENT */}

                      <div className="
                        relative
                        flex h-full
                        flex-col
                        items-center
                        justify-center
                        gap-1
                      ">

                        <StageIcon
                          boss={boss}
                          locked={!unlocked}
                          active={active}
                        />

                        {unlocked ? (

                          <>

                            <div
                              className={`
                                text-xs
                                font-bold
                                tracking-[0.25em]

                                ${
                                  active
                                    ? boss
                                      ? "text-yellow-300"
                                      : "text-cyan-300"
                                    : boss
                                      ? "text-yellow-400/70"
                                      : "text-[#39ff14]/70"
                                }
                              `}
                            >
                              {levelLabel(level)}
                            </div>

                            <div
                              className={`
                                text-[7px]
                                tracking-[0.25em]

                                ${
                                  boss
                                    ? "text-yellow-300/60"
                                    : "text-white/30"
                                }
                              `}
                            >
                              {levelSubLabel(level)}
                            </div>

                          </>

                        ) : (

                          <>

                            <div className="
                              text-[10px]
                              tracking-[0.3em]
                              text-white/20
                            ">
                              LOCKED
                            </div>

                            <div className="
                              text-[7px]
                              tracking-[0.2em]
                              text-red-400/30
                            ">
                              UNREACHED
                            </div>

                          </>

                        )}

                      </div>

                      {/* SELECT INDICATOR */}

                      {active && unlocked && (

                        <div
                          className={`
                            absolute
                            bottom-0
                            left-0
                            h-1
                            w-full

                            ${
                              boss
                                ? `
                                  bg-yellow-300
                                  shadow-[0_0_12px_#ffe600]
                                `
                                : `
                                  bg-cyan-300
                                  shadow-[0_0_12px_#00ffff]
                                `
                            }
                          `}
                        />

                      )}

                      {/* STAGE NUMBER */}

                      <div className="
                        absolute
                        left-2
                        top-2
                        text-[8px]
                        tracking-widest
                        text-white/20
                      ">
                        {String(level).padStart(2, "0")}
                      </div>

                      {/* BOSS LABEL */}

                      {boss && unlocked && (

                        <div className="
                          absolute
                          right-2
                          top-2
                          text-[7px]
                          font-bold
                          tracking-[0.2em]
                          text-yellow-400/60
                        ">
                          BOSS
                        </div>

                      )}

                    </button>
                  )
                })}

              </div>

              {/* ZONE STATUS */}

              <div className="
                mt-2
                flex
                items-center
                justify-between
                px-1
                text-[7px]
                tracking-[0.25em]
              ">

                <span
                  className={
                    zoneUnlocked
                      ? "text-[#39ff14]/30"
                      : "text-white/10"
                  }
                >
                  {zoneUnlocked
                    ? "ACCESS GRANTED"
                    : "ACCESS RESTRICTED"}
                </span>

                <span className="text-white/10">
                  LEVELS {firstLevel}–{lastLevel}
                </span>

              </div>

            </section>
          )
        })}

      </div>

    </FlightLayout2>
  )
}