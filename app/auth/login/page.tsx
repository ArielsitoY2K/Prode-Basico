'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signIn } from '@/lib/api/actions'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn({ username, password })
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, signIn redirects to /dashboard
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-4 py-4">
        <Link href="/" className="flex flex-col leading-none w-fit">
          <span className="font-bebas text-white text-xl">PRODE</span>
          <span className="font-bebas text-neon text-xl -mt-1">2026</span>
        </Link>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-bebas text-5xl text-white mb-1">INGRESÁ</h1>
            <h2 className="font-bebas text-5xl text-neon">A TU CUENTA</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
                Usuario
              </label>
              <input
                type="text"
                className="input-dark"
                placeholder="tu_usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <input
                type="password"
                className="input-dark"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-neon w-full py-4 rounded font-bold text-base"
            >
              {loading ? 'INGRESANDO...' : 'INGRESAR'}
            </button>
          </form>

          <p className="text-center text-sm text-[#555] mt-6">
            ¿No tenés cuenta?{' '}
            <Link href="/auth/register" className="text-neon hover:underline">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
