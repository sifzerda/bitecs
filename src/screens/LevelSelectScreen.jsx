// src/screens/LevelSelectScreen.jsx

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  useGameStore,
  SCREEN,
  WAVES_PER_ZONE,
  isBossLevel,
  getZone,
  getWave,
  formatLevelLabel,
} from "../../store/gameStore.js"
import FlightLayout2 from "../components/FlightLayout2.jsx"


function levelLabel(level) {
  return `WAVE ${getWave(level)}`
}


function levelSubLabel(level) {
  return isBossLevel(level) ? "BOSS // CORE" : "ASTEROID FIELD"
}


function StageIcon({ boss, locked, active }) {
  if (locked) {
    return (
      <div className="text-3xl text-white/20">
        🔒
      </div>
    )
  }

  if (boss) {
    return (
      <div
        className={`
          relative flex h-14 w-14 items-center justify-center
          border-2 rotate-45
          ${
            active
              ? "border-yellow-300 bg-yellow-400/10 shadow-[0_0_24px_rgba(255,220,50,0.6)]"
              : "border-yellow-400/60 bg-yellow-400/5"
          }
        `}
      >
        <span className="-rotate-45 text-2xl text-yellow-300">
          ☠
        </span>
      </div>
    )
  }

  return (
    <div
      className={`
        relative flex h-14 w-14 items-center justify-center
        rounded-full border-2
        ${
          active
            ? "border-cyan-300 bg-cyan-400/10 shadow-[0_0_22px_rgba(0,255,255,0.55)]"
            : "border-[#39ff14]/50 bg-[#39ff14]/5"
        }
      `}
    >
      <div className="h-5 w-5 rounded-full border border-current" />

      <div className="absolute h-8 w-px bg-current/60" />
      <div className="absolute h-px w-8 bg-current/60" />
    </div>
  )
}


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


export default function LevelSelectScreen({ onPlay, onBack }) {

  const highestLevelReached = useGameStore(
    (s) => s.highestLevelReached
  )

  const isLevelUnlocked = useGameStore(
    (s) => s.isLevelUnlocked
  )

  const startLevel = useGameStore(
    (s) => s.startLevel
  )


  // ------------------------------------------------------------
  // ZONES
  // ------------------------------------------------------------

  const zoneCount = useMemo(() => {
    return Math.max(
      1,
      getZone(highestLevelReached) + 1
    )
  }, [highestLevelReached])


  const totalLevels =
    zoneCount * WAVES_PER_ZONE


  const [selected, setSelected] = useState(() =>
    Math.max(
      1,
      Math.min(
        highestLevelReached,
        totalLevels
      )
    )
  )


  // ------------------------------------------------------------
  // KEEP SELECTION VALID
  // ------------------------------------------------------------

  useEffect(() => {

    setSelected((prev) => {

      const clamped = Math.max(
        1,
        Math.min(prev, totalLevels)
      )

      if (!isLevelUnlocked(clamped)) {
        return Math.max(
          1,
          highestLevelReached
        )
      }

      return clamped
    })

  }, [
    highestLevelReached,
    totalLevels,
    isLevelUnlocked,
  ])


  // ------------------------------------------------------------
  // SELECT
  // ------------------------------------------------------------

  const select = useCallback(
    (level) => {

      if (!isLevelUnlocked(level)) {
        return
      }

      setSelected(level)

    },
    [isLevelUnlocked]
  )


  // ------------------------------------------------------------
  // PLAY
  // ------------------------------------------------------------

  const play = useCallback(() => {

    if (!isLevelUnlocked(selected)) {
      return
    }

    startLevel(selected)
    onPlay?.(selected)

  }, [
    selected,
    isLevelUnlocked,
    startLevel,
    onPlay,
  ])


  // ------------------------------------------------------------
  // BACK
  // ------------------------------------------------------------

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


  // ------------------------------------------------------------
  // KEYBOARD
  // ------------------------------------------------------------

  useEffect(() => {

    const onKey = (e) => {

      if (
        e.key === "Escape" ||
        e.key === "Backspace"
      ) {
        e.preventDefault()
        back()
        return
      }

      if (e.key === "Enter") {
        e.preventDefault()
        play()
      }

    }

    window.addEventListener(
      "keydown",
      onKey
    )

    return () =>
      window.removeEventListener(
        "keydown",
        onKey
      )

  }, [back, play])


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <FlightLayout2
      title="LEVEL SELECT"
      footer={`REACHED: ${formatLevelLabel(highestLevelReached)}`}
      size="xl"
      centered={false}
      scrollable
    >

      <div className="mx-auto w-full max-w-5xl font-mono">

        {/* ======================================================
            TOP STATUS BAR
        ====================================================== */}

        <div className="
          mb-6
          flex
          items-center
          justify-between
          border-y
          border-cyan-400/20
          bg-black/50
          px-4
          py-3
          text-[9px]
          tracking-[0.3em]
        ">

          <div className="flex items-center gap-3">

            <span className="text-cyan-300">
              SECTOR MAP
            </span>

            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#00ffff]" />

          </div>

          <div className="text-[#39ff14]/60">
            PROGRESS
            <span className="ml-2 text-[#39ff14]">
              {highestLevelReached}/{totalLevels}
            </span>
          </div>

        </div>


        {/* ======================================================
            ZONES
        ====================================================== */}

        {Array.from({
          length: zoneCount,
        }).map((_, i) => {

          const zone = i + 1
          const base =
            (zone - 1) * WAVES_PER_ZONE

          const zoneUnlocked =
            isLevelUnlocked(base + 1)

          const zoneReached =
            highestLevelReached >= base + 1


          return (

            <section
              key={zone}
              className="relative mb-10"
            >

              {/* ==================================================
                  ZONE HEADER
              ================================================== */}

              <div className="
                mb-4
                flex
                items-center
                gap-4
              ">

                <div className="
                  flex
                  items-center
                  gap-3
                  text-[11px]
                  font-bold
                  tracking-[0.35em]
                ">

                  <span className="
                    text-cyan-300
                    drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]
                  ">
                    ZONE {String(zone).padStart(2, "0")}
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

                <div className="h-px flex-1 bg-linear-to-r from-cyan-400/30 to-transparent" />

              </div>


              {/* ==================================================
                  STAGE MAP
              ================================================== */}

              <div className="
                relative
                grid
                grid-cols-2
                gap-3
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

                {Array.from({
                  length: WAVES_PER_ZONE,
                }).map((_, j) => {

                  const level =
                    base + j + 1

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
                      onClick={() =>
                        select(level)
                      }
                      className={`
                        group
                        relative
                        h-36
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
                        absolute
                        inset-0
                        opacity-20
                        bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.04)_51%)]
                        bg-size-[100%_4px]
                      " />


                      {/* ACTIVE GLOW */}

                      {active && unlocked && (
                        <div
                          className={`
                            pointer-events-none
                            absolute
                            inset-0
                            ${
                              boss
                                ? "bg-[radial-gradient(circle_at_center,rgba(255,220,50,0.14),transparent_65%)]"
                                : "bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.14),transparent_65%)]"
                            }
                          `}
                        />
                      )}


                      {/* CONTENT */}

                      <div className="
                        relative
                        flex
                        h-full
                        flex-col
                        items-center
                        justify-center
                        gap-2
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
                                text-sm
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
                                ? "bg-yellow-300 shadow-[0_0_12px_#ffe600]"
                                : "bg-cyan-300 shadow-[0_0_12px_#00ffff]"
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

            </section>

          )

        })}


        {/* ======================================================
            SELECTED STAGE INFO
        ====================================================== */}

        <div className="
          relative
          mb-6
          border
          border-cyan-400/30
          bg-black/70
          px-5
          py-4
          shadow-[0_0_18px_rgba(0,255,255,0.08)]
        ">

          <CornerBrackets />

          <div className="
            flex
            flex-col
            gap-3
            sm:flex-row
            sm:items-center
            sm:justify-between
          ">

            <div>

              <div className="
                mb-1
                text-[8px]
                tracking-[0.35em]
                text-white/30
              ">
                SELECTED MISSION
              </div>

              <div className="
                text-lg
                font-bold
                tracking-[0.2em]
                text-cyan-300
                drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]
              ">
                {formatLevelLabel(selected)}
              </div>

            </div>


            <div className="
              text-right
              text-[8px]
              tracking-[0.25em]
              text-[#39ff14]/50
            ">
              <div>
                SYSTEM STATUS
              </div>

              <div className="
                mt-1
                text-[#39ff14]
              ">
                {isLevelUnlocked(selected)
                  ? "READY FOR DEPLOYMENT"
                  : "ACCESS DENIED"}
              </div>

            </div>

          </div>

        </div>


        {/* ======================================================
            ACTION BUTTONS
        ====================================================== */}

        <div className="
          flex
          flex-col
          justify-center
          gap-3
          pb-4
          sm:flex-row
        ">

          <button
            type="button"
            onClick={play}
            disabled={!isLevelUnlocked(selected)}
            className="
              group
              relative
              w-full
              overflow-hidden
              border-2
              border-cyan-300
              bg-cyan-400/8
              px-8
              py-4
              text-sm
              font-bold
              tracking-[0.35em]
              text-cyan-300
              shadow-[0_0_18px_rgba(0,255,255,0.15)]
              transition-all
              hover:bg-cyan-400/18
              hover:shadow-[0_0_28px_rgba(0,255,255,0.3)]
              disabled:cursor-not-allowed
              disabled:border-white/10
              disabled:text-white/20
              disabled:shadow-none
              sm:w-64
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

          <button
            type="button"
            onClick={back}
            className="
              w-full
              border
              border-[#39ff14]/40
              bg-black/50
              px-8
              py-4
              text-sm
              font-bold
              tracking-[0.35em]
              text-[#39ff14]/70
              transition-all
              hover:border-[#39ff14]
              hover:bg-[#39ff14]/6
              hover:text-[#39ff14]
              sm:w-48
            "
          >
            BACK
          </button>

        </div>

      </div>

    </FlightLayout2>
  )
}