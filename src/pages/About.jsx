//src/pages/About.jsx

import { Link } from 'react-router-dom';
import BG from '../components/BG';
import FlightLayout from '../components/FlightLayout';

const TECH_STACK = [
    { name: 'Vite', slug: 'vite' },
    { name: 'React', slug: 'react' },
    { name: 'Tailwind CSS', slug: 'tailwindcss' },
    { name: 'Three.js', slug: 'threedotjs' },
    { name: 'bitECS', slug: 'unity' },

];

export default function About() {
    return (
        <>

            <BG />

            <FlightLayout title="ABOUT" footer="SYSTEM ONLINE">

                <div className="font-mono text-[#39ff14]/80">

                    {/* ================= TECH STACK ================= */}
                    <div className="mt-2 mx-auto inline-block text-left">
                        <div className="mb-3 text-md tracking-[0.20em] text-[#39ff14]/60">BUILT WITH</div>

                        <ul className="space-y-3">
                            {TECH_STACK.map((tech) => (
                                <li key={tech.slug} className="flex items-center gap-3">
                                    <img
                                        src={`https://cdn.simpleicons.org/${tech.slug}/39ff14`}
                                        alt={`${tech.name} logo`}
                                        className="w-5 h-5 shrink-0"
                                        loading="lazy"
                                    />
                                    <span className="text-xs tracking-[0.2em] text-white/90">
                                        {tech.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                </div>

            </FlightLayout>

        </>
    )
}