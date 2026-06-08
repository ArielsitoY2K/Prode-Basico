'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signUp, signIn } from '@/lib/api/actions'

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    const result = await signUp(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Auto-login after registration
    await signIn({ username: form.username, password: form.password })
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="border-b border-[#1a1a1a] px-4 py-4">
        <Link href="/" className="flex flex-col leading-none w-fit">
          <span className="font-bebas text-white text-xl">PRODE</span>
          <span className="font-bebas text-neon text-xl -mt-1">2026</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-bebas text-5xl text-white mb-1">CREÁ</h1>
            <h2 className="font-bebas text-5xl text-neon">TU CUENTA</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Nombre</label>
                <input
                  type="text"
                  name="firstName"
                  className="input-dark"
                  placeholder="Juan"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Apellido</label>
                <input
                  type="text"
                  name="lastName"
                  className="input-dark"
                  placeholder="García"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Usuario</label>
              <input
                type="text"
                name="username"
                className="input-dark"
                placeholder="juangarcia"
                value={form.username}
                onChange={handleChange}
                required
                pattern="[a-zA-Z0-9_]+"
                minLength={3}
                maxLength={30}
              />
              <p className="text-xs text-[#555] mt-1">Solo letras, números y guiones bajos</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Contraseña</label>
              <input
                type="password"
                name="password"
                className="input-dark"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
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
              {loading ? 'CREANDO CUENTA...' : 'CREAR CUENTA'}
            </button>
          </form>

          <p className="text-center text-sm text-[#555] mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link href="/auth/login" className="text-neon hover:underline">
              Ingresá
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
