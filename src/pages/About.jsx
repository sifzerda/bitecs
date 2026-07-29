//src/pages/About.jsx

import { Link } from 'react-router-dom';
import BG from '../components/BG';
import FlightLayout from '../components/FlightLayout';

export default function About() {
    return (
        <>

            <BG />

            <FlightLayout title="ABOUT" footer="SYSTEM ONLINE">

                <div className="font-mono text-[#39ff14]/80">

                    <div className="text-left py-2 mx-auto inline-block text-xs tracking-[0.2em]">
                        <p className="space-y-1 text-white/90">
                            A game of asteroids made in React, TailwindCSS, using Three-Fiber + post-processing, Miniplex, an ECS structure, and Memoized components.
                        </p>
                    </div>

                </div>

            </FlightLayout>

        </>
    )
}

