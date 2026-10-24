// src/screens/GunsScreen.jsx

import { useState } from "react"
import { useGameStore, SCREEN } from "../../store/gameStore.js"
import { startState } from "../state/startState.js"
import { WEAPONS, getWeapon } from "../ecs/weapons/config/weapons.js"
import { getGunTypeByWeaponId } from "../ecs/weapons/config/gunConfigs.js"
import FlightLayout2 from "../components/FlightLayout2.jsx"
import { ScreenActions, useScreenKeys } from "../components/ScreenActions.jsx"

export function GunsScreen({ onBack }) {

  const unlocked = useGameStore(s => s.unlockedWeapons)
  const pending = useGameStore(s => s.pendingUnlockWeapon)
  const [selected, setSelected] = useState(() => pending ?? startState.currentWeapon)
  const gun = getGunTypeByWeaponId(selected)
  const weapon = getWeapon(selected)
  const available = unlocked.includes(selected)

  function back() {
    if (onBack) onBack();
    else useGameStore.getState().setScreen(SCREEN.MENU)
  }

  function equip() {
    if (!available) return;
    startState.currentWeapon = selected;
    back()
  }

  useScreenKeys({
    escape: back,
    backspace: back,
    enter: equip
  })

  return (
    <FlightLayout2 title="GUNS" footer="ARMOURY" size="2xl" centered={false} scrollable>
      <div className="mx-auto grid max-w-5xl gap-8 font-mono text-white/80 md:grid-cols-2">
        <div className="grid grid-cols-3 gap-2">{WEAPONS.map(w => {

          const g = getGunTypeByWeaponId(w.id);
          const open = unlocked.includes(w.id);

          return (
            <button type="button" key={w.id} onClick={() => setSelected(w.id)} aria-pressed={selected === w.id}
              className={`border p-3 text-xs focus-visible:outline-2 focus-visible:outline-cyan-200 ${selected === w.id ? "border-cyan-200 bg-cyan-500/10" : "border-white/20"}`}>

              <img src={g.svg} alt="" className={`h-12 w-full object-contain ${open ? "" : "brightness-0"}`} />

              <span>{g.name}</span>
              <span className="mt-1 block text-yellow-200">{!open ? "LOCKED" : pending === w.id ? "NEW" : ""}</span>
            </button>
          )

        })}</div>

        <section>
          <img src={gun.svg} alt={gun.name} className={`h-40 w-full object-contain ${available ? "" : "brightness-0"}`} />

          <h2 className="mt-4 text-xl text-cyan-300">{gun.name}</h2>
          <p className="mt-3 text-sm leading-relaxed">{gun.description}</p>
          <p className="mt-4 text-xs"> {weapon.category.toUpperCase()} · {available ? "Unlocked" : "Defeat its boss to unlock"}</p>

          <ScreenActions items={[
            {
              label: "Equip", action: equip, disabled: !available
            },
            {
              label: "Back", action: back
            }
          ]} />
        </section>
      </div>

    </FlightLayout2>
  )
}
