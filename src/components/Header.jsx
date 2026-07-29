// src/components/Header.jsx

import { Link, NavLink } from 'react-router-dom';

export function Header() {
  const links = [
    { to: '/', label: 'GAME' },
    { to: '/about', label: 'ABOUT' },
    { to: '/contact', label: 'CONTACT' },
    { to: '/other', label: 'OTHER' },
  ];

  const linkClass = ({ isActive }) =>
    `uppercase tracking-widest text-xs transition-colors hover:text-green-400 ${
      isActive ? 'text-green-400' : 'text-gray-400'
    }`;

  return (
    <header className="relative z-50 w-full bg-[#0a0a14] border-b border-green-400/30 font-mono">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 min-h-14 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link
          to="/"
          className="text-green-400 text-base sm:text-lg tracking-widest uppercase font-bold text-center sm:text-left whitespace-nowrap hover:text-green-300 transition-colors"
        >
          🚀 Asteroids bitECS
        </Link>

        <nav className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm tracking-wide">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}