// src/screens/LevelCompleteScreen.jsx

import { useGameStore, formatLevelLabel, TOTAL_LEVELS } from "../../store/gameStore.js"
import { getGunTypeByWeaponId } from "../ecs/weapons/config/gunConfigs.js"
import { startState } from "../state/startState.js"
import FlightLayout2 from "../components/FlightLayout2.jsx"
import { ScreenActions, useScreenKeys } from "../components/ScreenActions.jsx"

export function LevelCompleteScreen({ onContinue, onGuns, onMenu }) {

  const level = useGameStore(state => state.level)
  const reward = useGameStore(state => state.pendingUnlockWeapon)
  const final = level >= TOTAL_LEVELS
  const gun = reward == null ? null : getGunTypeByWeaponId(reward)

  useScreenKeys({
    enter: () => onContinue?.(),
    g: () => onGuns?.(),
    escape: () => onMenu?.(),
    backspace: () => onMenu?.()
  })
  return (
    <FlightLayout2 title={final ? "CAMPAIGN COMPLETE" : "LEVEL COMPLETE"} footer={`${formatLevelLabel(level)} CLEARED`}>

      <div className="mx-auto max-w-xl text-center font-mono text-white/80">
        <p className="mt-8 text-cyan-300">{formatLevelLabel(level)} CLEARED</p>
        <p className="mt-4">Score {startState.score.toLocaleString()} · Lives {startState.lives}</p>
        {gun &&
          <div className="mt-6 border border-yellow-400/50 bg-yellow-400/5 p-6">
            <p className="text-xs text-yellow-200">NEW WEAPON UNLOCKED</p>
            <h2 className="mt-3 text-xl text-yellow-300">{gun.name}</h2>
            <p className="mt-3 text-xs text-white/50">Open Guns to equip it. Your current weapon stays equipped.</p>
          </div>
        }

        <ScreenActions items={[
          {
            label: final ? "Finish [Enter]" : "Continue [Enter]",
            action: onContinue
          },
          onGuns && {
            label: "Guns [G]",
            action: onGuns
          }, {
            label: "Main menu [Esc]",
            action: onMenu
          }
        ]} />

      </div>
    </FlightLayout2>
  )
}

