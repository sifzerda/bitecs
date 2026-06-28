// src/components/Footer.jsx

import { FaGithub } from 'react-icons/fa'

export function Footer() {

  return (
    <footer className="w-full bg-[#0a0a14] border-t border-green-400/30 font-mono">
      <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">

        <span className="text-xs tracking-widest uppercase text-white">
          sifzerda © 2026
        </span>

        <a href="https://github.com/sifzerda"
          title="GitHub"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white  hover:text-green-400 transition-colors uppercase tracking-widest text-xs">
          <FaGithub size={18} />
          GitHub
        </a>

      </div>
    </footer>
  )
}