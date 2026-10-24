// src/screens/HighscoresScreen.jsx

import { useState } from 'react';
import FlightLayout2 from '../components/FlightLayout2.jsx';
import { ScreenActions, useScreenKeys } from "../components/ScreenActions.jsx"
import { getHighscores } from "../state/highscores.js"
import { formatLevelLabel } from "../../store/gameStore.js"

export default function HighscoresScreen({ onBack }) {

  const [rows] = useState(getHighscores)

  useScreenKeys({
    enter: () => onBack?.(),
    escape: () => onBack?.(),
    backspace: () => onBack?.()
  })

  return (
    <FlightLayout2 title="HIGHSCORES" footer="LOCAL RECORDS" scrollable>
      <div className="mx-auto mt-8 max-w-2xl font-mono text-white/80">
        {rows.length ?
          <table className="w-full text-left text-sm">
            <thead className="text-cyan-300"><tr><th className="p-3">Rank</th>
              <th>Score</th>
              <th>Encounter</th>
            </tr>
            </thead>
            <tbody>{rows.map((row, index) => <tr key={row.id}
              className="border-t border-white/10">
              <td className="p-3">{index + 1}</td>
              <td>{row.score.toLocaleString()}</td>
              <td>{formatLevelLabel(row.level)}</td></tr>
            )}</tbody></table> : <p className="text-center">Complete a run to set your first record.</p>}
        <ScreenActions items={[{ label: "Back", action: onBack }]} />
      </div>
    </FlightLayout2>
  );
}