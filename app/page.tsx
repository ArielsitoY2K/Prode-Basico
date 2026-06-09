import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import { getUpcomingMatches } from '../lib/api/queries'
import { formatMatchDate, formatMatchTime } from '../lib/utils'

// FORZAMOS A QUE CORRA EN EL EDGE RUNTIME IGUAL QUE EL PROXY
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  let user = null
  let upcomingMatches: any[] = []

  // Encapsulamos Supabase por completo para que NADA rompa el renderizado de la página
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user
  } catch (error) {
    console.error("Supabase Auth Error en Landing:", error)
    // Si falla, dejamos user en null para que al menos cargue la interfaz
  }

  // Si efectivamente hay usuario, metemos la redirección fuera del bloque de inicialización
  if (user) {
    redirect('/dashboard')
  }

  // Intentamos traer los partidos para el Prode
  try { 
    upcomingMatches = await getUpcomingMatches(4) 
  } catch (error) {
    console.error("Error al traer partidos en Landing:", error)
  }

  return (
    // ... TODO TU CÓDIGO JSX SIGUE EXACTAMENTE IGUAL ABAJO ...
    <div className="min-h-screen bg-black">
      <header className="border-b border-[#1a1a1a] px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex flex-col leading-none">
            <span className="font-bebas text-white text-xl">PRODE</span>
            <span className="font-bebas text-neon text-xl -mt-1">2026</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-[#888] hover:text-white font-medium">Ingresar</Link>
            <Link href="/auth/register" className="btn-neon px-4 py-2 text-sm rounded">Registrarse</Link>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block mb-4">
              <span className="text-xs font-bold text-neon tracking-[0.3em] uppercase border border-neon/30 bg-neon/10 px-3 py-1 rounded-full">FIFA WORLD CUP 2026</span>
            </div>
            <h1 className="font-bebas text-6xl md:text-8xl leading-none mb-4">
              <span className="text-white">VIVÍ EL</span><br/>
              <span className="text-white">MUNDIAL</span><br/>
              <span className="text-neon">2026</span>
            </h1>
            <p className="text-[#888] text-lg mb-8 leading-relaxed">Adiviná los resultados, sumá puntos y competí con tus amigos en el torneo de pronósticos más grande.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/register" className="btn-neon px-8 py-4 rounded text-base font-bold text-center">JUGAR AHORA</Link>
              <Link href="/auth/login" className="px-8 py-4 rounded text-base font-bold text-center border border-[#333] text-[#888] hover:border-[#555] hover:text-white transition-colors">YA TENGO CUENTA</Link>
            </div>
            <div className="flex items-center gap-6 mt-10">
              {[{f:'🇨🇦',n:'CANADÁ'},{f:'🇲🇽',n:'MÉXICO'},{f:'🇺🇸',n:'ESTADOS UNIDOS'}].map(c => (
                <div key={c.n} className="flex items-center gap-2">
                  <span className="text-xl">{c.f}</span>
                  <span className="text-xs font-semibold text-[#555]">{c.n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="relative">
              <div className="w-64 h-64 bg-gradient-to-br from-neon/20 to-transparent rounded-full flex items-center justify-center">
                <span className="text-9xl">🏆</span>
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-bebas text-7xl text-neon/20 whitespace-nowrap">2026</div>
            </div>
          </div>
        </div>
      </section>

      {upcomingMatches.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <h2 className="font-bebas text-3xl text-white mb-4">PRÓXIMOS PARTIDOS</h2>
          <div className="card-dark overflow-hidden">
            {upcomingMatches.map((match, i) => (
              <div key={match.id} className={`flex items-center px-4 py-4 ${i < upcomingMatches.length-1 ? 'border-b border-[#1a1a1a]' : ''}`}>
                <div className="w-28 shrink-0">
                  <div className="text-xs text-[#555] font-medium">{formatMatchDate(match.match_date)}</div>
                  {match.group && <div className="text-xs text-[#444] uppercase">GRUPO {match.group.code}</div>}
                </div>
                <div className="flex-1 text-sm font-semibold">{match.home_team?.name}</div>
                <div className="font-bebas text-xl text-neon px-4">{formatMatchTime(match.match_date)}</div>
                <div className="flex-1 text-sm font-semibold text-right">{match.away_team?.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {icon:'⚽',title:'104 PARTIDOS',desc:'Pronosticá todos los partidos del torneo'},
            {icon:'📊',title:'RANKING EN VIVO',desc:'Competí con todos los participantes'},
            {icon:'⚡',title:'TIEMPO REAL',desc:'Resultados y marcadores en vivo'},
          ].map(f => (
            <div key={f.title} className="card-dark p-6">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-bebas text-xl text-neon mt-3 mb-2">{f.title}</h3>
              <p className="text-sm text-[#888]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#1a1a1a] py-6 text-center text-xs text-[#444]">
        PRODE 2026 · Los puntos se actualizan al finalizar cada partido
      </footer>
    </div>
  )
}
