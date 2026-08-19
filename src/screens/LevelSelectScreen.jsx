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
  return isBossLevel(level) ? "BOSS" : "ASTEROIDS"
}

export default function LevelSelectScreen({ onPlay, onBack }) {
  const highestLevelReached = useGameStore((s) => s.highestLevelReached)
  const isLevelUnlocked = useGameStore((s) => s.isLevelUnlocked)
  const startLevel = useGameStore((s) => s.startLevel)

  // Show full stages up through the one after the highest reached.
  const zoneCount = useMemo(() => {
    return Math.max(1, getZone(highestLevelReached) + 1)
  }, [highestLevelReached])

  const totalLevels = zoneCount * WAVES_PER_ZONE

  const [selected, setSelected] = useState(() =>
    Math.max(1, Math.min(highestLevelReached, totalLevels))
  )

  // Keep selection unlocked and in range when progress changes.
  useEffect(() => {
    setSelected((prev) => {
      const clamped = Math.max(1, Math.min(prev, totalLevels))
      if (!isLevelUnlocked(clamped)) {
        return Math.max(1, highestLevelReached)
      }
      return clamped
    })
  }, [highestLevelReached, totalLevels, isLevelUnlocked])

  const select = useCallback(
    (level) => {
      if (!isLevelUnlocked(level)) return
      setSelected(level)
    },
    [isLevelUnlocked]
  )

  const play = useCallback(() => {
    if (!isLevelUnlocked(selected)) return
    startLevel(selected)
    onPlay?.(selected)
  }, [selected, isLevelUnlocked, startLevel, onPlay])

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault()
        back()
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        play()
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [back, play])

  return (
    <FlightLayout2
      title="LEVEL SELECT"
      footer={`REACHED: ${formatLevelLabel(highestLevelReached)}`}
      size="xl"
      centered={false}
    >
      <div className="max-w-5xl mx-auto font-mono text-xs tracking-[0.2em]">
        {Array.from({ length: zoneCount }).map((_, i) => {
          const zone = i + 1
          const base = (zone - 1) * WAVES_PER_ZONE

          return (
            <section key={zone} className="mb-8">
              <div className="mb-3 text-[#39ff14]/60 tracking-[0.3em]">
                ZONE {zone}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: WAVES_PER_ZONE }).map((_, j) => {
                  const level = base + j + 1
                  const unlocked = isLevelUnlocked(level)
                  const active = selected === level
                  const boss = isBossLevel(level)

                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => select(level)}
                      className={`
                        relative h-28 border flex flex-col
                        items-center justify-center
                        transition-all duration-200
                        ${active && unlocked
                          ? "border-cyan-300 text-cyan-300 bg-cyan-500/10 shadow-[0_0_18px_rgba(0,255,255,0.35)]"
                          : unlocked
                            ? "border-[#39ff14]/40 text-[#39ff14]/80 bg-black/40 hover:border-cyan-300/70"
                            : "border-white/10 text-white/20 bg-black/60 cursor-not-allowed"
                        }
                      `}
                    >
                      {unlocked ? (
                        <>
                          <div className="text-2xl tracking-[0.2em]">
                            {levelLabel(level)}
                          </div>
                          <div
                            className={`
                              mt-2 text-[8px] tracking-[0.25em]
                              ${boss ? "text-yellow-400/70" : "text-white/30"}
                            `}
                          >
                            {levelSubLabel(level)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xl opacity-30">LOCKED</div>
                          <div className="mt-2 text-[8px] text-red-400/50">
                            UNREACHED
                          </div>
                        </>
                      )}

                      {active && unlocked && (
                        <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-cyan-300 animate-pulse">
                          ▶
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        <div className="mt-8 flex justify-center gap-4">
          <button
            type="button"
            onClick={play}
            disabled={!isLevelUnlocked(selected)}
            className="w-56 py-3 border border-green-300 text-cyan-300 bg-cyan-500/10 uppercase tracking-[0.4em] hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            PLAY {formatLevelLabel(selected)}
          </button>

          <button
            type="button"
            onClick={back}
            className="w-44 py-3 border border-[#39ff14]/40 text-[#39ff14]/70 bg-black/40 uppercase tracking-[0.4em] hover:border-cyan-300/70 hover:text-cyan-300"
          >
            BACK
          </button>
        </div>
      </div>
    </FlightLayout2>
  )
}