import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUpcomingMatches, getLiveMatches, getUserProfile, getUserRank } from '@/lib/api/queries'
import { AppLayout } from '@/components/layout/AppLayout'
import { MatchCard } from '@/components/matches/MatchCard'
import Link from 'next/link'
import { formatMatchDate, formatMatchTime } from '@/lib/utils'

export const revalidate = 60

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profile, rank, upcoming, live] = await Promise.allSettled([
    getUserProfile(user.id),
    getUserRank(user.id),
    getUpcomingMatches(8),
    getLiveMatches(),
  ])

  const profileData = profile.status === 'fulfilled' ? profile.value : null
  const rankData = rank.status === 'fulfilled' ? rank.value : null
  const upcomingMatches = upcoming.status === 'fulfilled' ? upcoming.value : []
  const liveMatches = live.status === 'fulfilled' ? live.value : []

  return (
    <AppLayout>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="font-bebas text-4xl text-white">
          HOLA, <span className="text-neon">{profileData?.first_name || profileData?.username || 'JUGADOR'}</span>
        </h1>
        <p className="text-[#555] text-sm mt-1">Mundial FIFA 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Puntos" value={profileData?.total_points ?? 0} highlight />
        <StatCard label="Posición" value={rankData?.rank ?? '-'} prefix="#" />
        <StatCard label="Pronósticos" value={profileData?.total_predictions ?? 0} />
        <StatCard label="Exactos" value={profileData?.correct_results ?? 0} />
      </div>

      {/* Live matches */}
      {liveMatches.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-live text-xs font-bold px-2 py-0.5 rounded-full">EN VIVO</span>
            <h2 className="font-semibold text-white">Partidos en curso</h2>
          </div>
          <div className="space-y-3">
            {liveMatches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming matches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bebas text-2xl text-white">PRÓXIMOS PARTIDOS</h2>
          <Link href="/fixture" className="text-neon text-sm font-semibold hover:underline">
            VER FIXTURE COMPLETO →
          </Link>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="card-dark p-8 text-center">
            <p className="text-[#555]">No hay partidos próximos.</p>
            <p className="text-xs text-[#444] mt-2">Los datos se cargan automáticamente.</p>
          </div>
        ) : (
          <div className="card-dark overflow-hidden">
            {upcomingMatches.map((match, i) => (
              <div
                key={match.id}
                className={`flex items-center px-4 py-4 hover:bg-[#111] transition-colors ${
                  i < upcomingMatches.length - 1 ? 'border-b border-[#1a1a1a]' : ''
                }`}
              >
                {/* Date */}
                <div className="w-36 shrink-0">
                  <div className="text-xs text-[#555] font-medium">{formatMatchDate(match.match_date)}</div>
                  {match.group && (
                    <div className="text-xs text-[#444] uppercase">GRUPO {match.group.code}</div>
                  )}
                  {!match.group && match.round_name && (
                    <div className="text-xs text-[#444] uppercase">{match.round_name}</div>
                  )}
                </div>

                {/* Home team */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <TeamFlag team={match.home_team} />
                  <span className="font-semibold text-sm truncate">{match.home_team?.name}</span>
                </div>

                {/* Time */}
                <div className="font-bebas text-xl text-neon px-4 shrink-0">
                  {formatMatchTime(match.match_date)}
                </div>

                {/* Away team */}
                <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                  <span className="font-semibold text-sm truncate text-right">{match.away_team?.name}</span>
                  <TeamFlag team={match.away_team} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Link href="/pronosticos" className="btn-neon px-6 py-3 rounded font-bold text-sm flex-1 text-center">
            CARGAR PRONÓSTICOS
          </Link>
          <Link href="/ranking" className="px-6 py-3 rounded font-bold text-sm border border-[#333] text-[#888] hover:border-[#555] hover:text-white transition-colors">
            VER RANKING
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}

function StatCard({ label, value, highlight, prefix }: {
  label: string
  value: number | string
  highlight?: boolean
  prefix?: string
}) {
  return (
    <div className="card-dark p-4">
      <div className={`font-bebas text-3xl ${highlight ? 'text-neon' : 'text-white'}`}>
        {prefix}{value}
      </div>
      <div className="text-xs text-[#555] mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function TeamFlag({ team }: { team?: { flag_url?: string; name?: string; short_name?: string } | null }) {
  if (!team) return <div className="w-6 h-4 bg-[#222] rounded shrink-0" />
  if (team.flag_url) return <img src={team.flag_url} alt={team.name} className="w-6 h-4 object-cover rounded shrink-0" loading="lazy" />
  return (
    <div className="w-6 h-4 bg-[#222] rounded flex items-center justify-center shrink-0">
      <span className="text-[8px] font-bold text-[#666]">{(team.short_name || team.name || '').substring(0,2)}</span>
    </div>
  )
}
