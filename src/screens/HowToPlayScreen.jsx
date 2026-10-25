// src/screens/HowToPlayScreen.jsx

import { ScreenActions, useScreenKeys } from "../components/ScreenActions.jsx"
import FlightLayout2 from '../components/FlightLayout2.jsx';

const PAGES = ['mouse', 'keyboard'];

export default function HowToPlayScreen({ onBack }) {

  useScreenKeys({ escape: () => onBack?.(), backspace: () => onBack?.() })
  return <FlightLayout2 title="HOW TO PLAY" footer="FLIGHT MANUAL" scrollable>

    <div className="mx-auto max-w-2xl font-mono text-white/80">

    <p className="mt-6 text-sm leading-relaxed">
      Clear each asteroid wave, then defeat the zone boss.
      Deflect boss fire or boost to avoid it.</p>

      <table className="w-full text-left text-sm">
        <thead className="text-cyan-200">
          <tr>
            <th className="p-3">Action</th>
            <th>Keyboard</th>
            <th>Mouse</th>
          </tr>
        </thead>

        <tbody>{[
          ["Thrust", "W / Up", "-"],
          ["Brake to stop", "S / Down", "-"],
          ["Strafe", "A, D / ← →", "-"],
          ["Aim · mouse mode", "-", "Move mouse"],
          ["Fire", "Space", "Left click"],
          ["Deflect", "X", "Right click"],
          ["Boost", "Shift", "-"],
          ["Pause / resume", "P / Escape", "-"]]
          .map(([a, b, c]) =>
            <tr key={a} className="border-t border-white/10">
              <td className="p-3">{a}</td>
              <td>{b}</td>
              <td>{c}</td>
            </tr>
          )}
        </tbody>
      </table>

      <ScreenActions items={[{ label: "Back", action: onBack }]} />
    </div>

  </FlightLayout2>
}
