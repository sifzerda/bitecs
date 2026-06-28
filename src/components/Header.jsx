//src/components/Header.jsx

export function Header() {
  return (
    <header className="w-full bg-[#0a0a14] border-b border-green-400/30 font-mono">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

        <span className="text-green-400 text-lg tracking-widest uppercase font-bold">
          ⚡ Asteroids bitECS
        </span>

        <nav className="flex items-center gap-8 text-sm text-gray-400 tracking-wide">
          {['Play', 'About', 'Contact', 'Other'].map(link => (
            
             <a key={link}
              href={`#${link.toLowerCase()}`}
              className="hover:text-green-400 transition-colors uppercase tracking-widest text-xs"
            >
              {link}
            </a>
          ))}
        </nav>

      </div>
    </header>
  )
}