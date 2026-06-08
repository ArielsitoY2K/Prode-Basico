'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/api/actions'
import { User } from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'PRÓXIMOS' },
  { href: '/fixture', label: 'FIXTURE' },
  { href: '/pronosticos', label: 'PRONÓSTICOS' },
  { href: '/ranking', label: 'POSICIONES' },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-black border-b border-[#1a1a1a]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex flex-col leading-none">
          <span className="font-bebas text-white text-xl tracking-wide">PRODE</span>
          <span className="font-bebas text-neon text-xl tracking-wide -mt-1">2026</span>
        </Link>

        {/* Nav Links - hidden on mobile */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${pathname === link.href || pathname.startsWith(link.href + '/') ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <form action={signOut}>
            <button
              type="submit"
              className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center hover:border-[#555] transition-colors"
            >
              <User size={16} className="text-[#888]" />
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold tracking-widest uppercase rounded transition-colors ${
              pathname === link.href
                ? 'bg-neon text-black'
                : 'text-[#888] hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
