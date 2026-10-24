// src/screens/SettingsScreen.jsx

import { useState } from 'react';
import { ScreenActions, useScreenKeys } from "../components/ScreenActions.jsx"
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "../ecs/systems/settings.js"
import FlightLayout2 from '../components/FlightLayout2.jsx';

export default function SettingsScreen({ onBack }) {
  const [draft, setDraft] = useState(() => ({ ...getSettings() }))
  const [error, setError] = useState("")
  const change = (key, value) => setDraft(previous => ({ ...previous, [key]: value }))
  function save() {

    if (saveSettings(draft)) onBack?.()
    else setError("Could not save settings. Check browser storage permissions.")
  }

  useScreenKeys({ escape: () => onBack?.(), backspace: () => onBack?.() })

  return (<FlightLayout2 title="SETTINGS" footer="FLIGHT CONFIGURATION" size="xl" centered scrollable>

    <form className="mx-auto w-full max-w-lg space-y-6 font-mono text-sm text-white/80" onSubmit={event => { event.preventDefault(); save() }}>

      <fieldset className="space-y-3"><legend className="mb-3 text-cyan-300">CONTROLS</legend>

        {[["keyboard", "Keyboard only"], ["keyboardMouse", "Mouse + keyboard"]].map(([value, label]) =>
          <label key={value} className="flex justify-between gap-4"><span>{label}</span>
            <input
              type="radio"
              name="controls"
              value={value}
              checked={draft.controlScheme === value}
              onChange={() => change("controlScheme", value)} />
          </label>
        )}

      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-cyan-300">GRAPHICS</legend>
        <label className="flex justify-between gap-4">Quality

          <select className="bg-slate-950 p-2" value={draft.quality} onChange={event => change("quality", event.target.value)}>

            <option value="low">Low · DPR 1</option>
            <option value="medium">Medium · DPR 1.5</option>
            <option value="high">High · DPR 2</option>

          </select>

        </label>

        <label className="flex justify-between">Bloom
          <input type="checkbox"
            checked={draft.bloom}
            onChange={event => change("bloom",
              event.target.checked)} />
        </label>

        <label className="flex justify-between">Show FPS
          <input type="checkbox"
            checked={draft.fps}
            onChange={event => change("fps",
              event.target.checked)} />
        </label>

      </fieldset>

      <p className="text-xs leading-relaxed text-white/50">Back discards changes. Save applies and remembers them. Audio and screen-shake controls can be added when those systems are connected.</p>
      {error && <p role="alert" className="text-red-300">{error}</p>}

      <ScreenActions items={[
        {
          label: "Back",
          action: onBack
        }, {
          label: "Defaults",
          action: () => setDraft({ ...DEFAULT_SETTINGS })
        },
        {
          label: "Save",
          action: save
        }
      ]} />
    </form>

  </FlightLayout2>
  )
}
