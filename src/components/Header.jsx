//src/components/Header.jsx

import { Link, useLocation } from 'react-router-dom';

export function Header() {
    const pathname = useLocation().pathname;

  const links = [
    { href: '/', label: 'PLAY' },
    { href: '/about', label: 'ABOUT' },
    { href: '/contact', label: 'CONTACT' },
    { href: '/other', label: 'OTHER' },
  ];

  return (
    <header className="w-full bg-[#0a0a14] border-b border-green-400/30 font-mono">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

        <span className="text-green-400 text-lg tracking-widest uppercase font-bold">
          🚀 Asteroids bitECS
        </span>

        <nav className="flex items-center gap-8 text-sm text-gray-400 tracking-wide">
          {links.map(({ href, label }) => (
            <Link key={href}
              to={href}
              className={`hover:text-green-400 transition-colors uppercase tracking-widest text-xs ${pathname === href ? 'text-green-400' : ''}`}>
              {label}
            </Link>
          ))}

        </nav>

      </div>
    </header>
  )
}

