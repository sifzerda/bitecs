//src/pages/About.jsx

import BG from '../components/BG';
import FlightLayout from '../components/FlightLayout';

const TECH_STACK = [
    { name: 'Vite', slug: 'vite' },
    { name: 'React', slug: 'react' },
    { name: 'Tailwind CSS', slug: 'tailwindcss' },
    { name: 'Three.js', slug: 'threedotjs' },
    { name: 'bitECS', slug: 'unity' },
    { name: 'Zustand', slug: 'zustand', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/zustand/zustand-original.svg', },

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
                                        src={tech.icon ?? `https://cdn.simpleicons.org/${tech.slug}/39ff14`}
                                        alt={`${tech.name} logo`}
                                        className="h-5 w-5 shrink-0 object-contain"
                                        style={tech.slug === 'zustand' ? {
                                            filter: 'brightness(0) saturate(100%) invert(87%) sepia(91%) saturate(3845%) hue-rotate(43deg) brightness(111%) contrast(119%)',
                                        } : undefined}
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