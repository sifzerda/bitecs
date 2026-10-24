// src/screens/LevelSelectScreen.jsx

import { useState } from "react"
import { useGameStore, formatLevelLabel } from "../../store/gameStore.js"
import { ScreenActions, useScreenKeys } from "../components/ScreenActions.jsx"
import { ZONES } from "../ecs/constants/progression.js"
import FlightLayout2 from "../components/FlightLayout2.jsx"

const zones = []
let next = 1

for (const zone of ZONES) { zones.push({ ...zone, first: next }); next += zone.waves.length + 1 }

// ============================================================
// LEVEL SELECT SCREEN
// ============================================================

export default function LevelSelectScreen({ onPlay, onBack }) {

  const highest = useGameStore(s => s.highestLevelReached)
  const [selected, setSelected] = useState(() => Math.max(1, Math.min(highest, next - 1)))

  function play() {
    if (selected > highest)
      return;
    if (onPlay) onPlay(selected);
    else useGameStore.getState().startLevel(selected)
  }

  useScreenKeys({ enter: play, escape: () => onBack?.(), backspace: () => onBack?.() })
  return (

    <FlightLayout2 title="LEVEL SELECT" footer={formatLevelLabel(selected)} size="2xl" centered={false} scrollable>

      <div className="mx-auto max-w-5xl font-mono">

        {zones.map(zone =>

          <section key={zone.id} className="mb-6">

            <h2 className="mb-3 text-cyan-300">ZONE {zone.id} · {zone.name}</h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              {Array.from({ length: zone.waves.length + 1 }, (_, i) => {
                const level = zone.first + i
                const locked = level > highest;

                return (
                  <button
                    key={level}
                    type="button"
                    disabled={locked}
                    aria-pressed={selected === level}
                    onClick={() => setSelected(level)}
                    className={`border p-5 text-sm text-white/80 disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-cyan-200 ${selected === level ? "border-cyan-200 bg-cyan-400/10" : "border-white/20"}`}>
                    {locked ? "LOCKED" : i === zone.waves.length ? "BOSS" : `WAVE ${i + 1}`}
                  </button>
                )
              })}</div>
          </section>)}

        <ScreenActions items={[
          { label: "Play selected", action: play },
          { label: "Back", action: onBack }
        ]} />

      </div>

    </FlightLayout2>

  )
}
