'use client'

import { useState, useEffect } from 'react'
import { LeaderboardEntry } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react'

interface RankingClientProps {
  entries: LeaderboardEntry[]
  currentUserId: string
  myRank: { rank: number; total_points: number } | null
}

export function RankingClient({ entries: initialEntries, currentUserId, myRank }: RankingClientProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [tab, setTab] = useState<'general' | 'friends'>('general')

  // Real-time leaderboard via Supabase subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leaderboard' },
        (payload) => {
          setEntries(prev => {
            const updated = prev.map(e =>
              e.user_id === payload.new.user_id
                ? { ...e, ...payload.new }
                : e
            )
            return updated.sort((a, b) => a.rank - b.rank)
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const myEntry = entries.find(e => e.user_id === currentUserId)

  return (
    <div>
      <h1 className="font-bebas text-4xl text-white mb-2">POSICIONES DEL PRODE</h1>
      <p className="text-xs text-[#555] mb-6 uppercase tracking-wider">Los puntos se actualizan al finalizar cada partido</p>

      {/* My position highlight */}
      {myEntry && (
        <div className="card-dark border border-neon/30 p-4 mb-6 flex items-center gap-4">
          <div className="font-bebas text-4xl text-neon w-12 text-center">
            #{myEntry.rank}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white">Tu posición</div>
            <div className="text-sm text-[#555]">
              {myEntry.total_points} pts · {myEntry.correct_results} exactos · {myEntry.correct_winners} ganadores
            </div>
          </div>
          <RankTrend entry={myEntry} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['general', 'friends'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-bold rounded transition-all uppercase ${
              tab === t ? 'bg-neon text-black' : 'bg-[#111] text-[#888] border border-[#222] hover:border-[#444] hover:text-white'
            }`}
          >
            {t === 'general' ? 'GENERAL' : 'AMIGOS'}
          </button>
        ))}
      </div>

      {tab === 'friends' ? (
        <div className="card-dark p-8 text-center">
          <p className="text-[#555]">La función de amigos estará disponible próximamente.</p>
        </div>
      ) : (
        <div className="card-dark overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_60px_40px_40px_40px] gap-2 px-4 py-3 border-b border-[#1a1a1a]">
            <div className="text-xs text-[#555] font-semibold uppercase">POS</div>
            <div className="text-xs text-[#555] font-semibold uppercase">COMPETIDOR</div>
            <div className="text-xs text-[#555] font-semibold uppercase text-right">PTS</div>
            <div className="text-xs text-[#555] font-semibold uppercase text-center">PJ</div>
            <div className="text-xs text-[#555] font-semibold uppercase text-center">✓✓</div>
            <div className="text-xs text-[#555] font-semibold uppercase text-center">✓</div>
          </div>

          {entries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#555]">Aún no hay participantes en el ranking.</p>
            </div>
          ) : (
            entries.map((entry, idx) => (
              <RankingRow
                key={entry.user_id}
                entry={entry}
                index={idx}
                isCurrentUser={entry.user_id === currentUserId}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function RankingRow({ entry, index, isCurrentUser }: {
  entry: LeaderboardEntry
  index: number
  isCurrentUser: boolean
}) {
  const rank = entry.rank || index + 1
  const isTop3 = rank <= 3

  return (
    <div className={`grid grid-cols-[48px_1fr_60px_40px_40px_40px] gap-2 px-4 py-3 border-b border-[#1a1a1a] last:border-0 items-center transition-colors ${
      isCurrentUser
        ? 'bg-neon/5 border-l-2 border-l-neon'
        : 'hover:bg-[#0d0d0d]'
    }`}>
      {/* Position */}
      <div className="text-center">
        {rank === 1 && <span className="text-xl">🥇</span>}
        {rank === 2 && <span className="text-xl">🥈</span>}
        {rank === 3 && <span className="text-xl">🥉</span>}
        {rank > 3 && (
          <span className={`font-bold text-sm ${isCurrentUser ? 'text-neon' : 'text-[#555]'}`}>
            {rank}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="min-w-0">
        <div className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-neon' : 'text-white'}`}>
          {entry.profile?.first_name && entry.profile?.last_name
            ? `${entry.profile.first_name} ${entry.profile.last_name.charAt(0)}.`
            : entry.profile?.username || 'Usuario'}
        </div>
        {entry.profile?.username && (
          <div className="text-xs text-[#555] truncate">@{entry.profile.username}</div>
        )}
      </div>

      {/* Points */}
      <div className={`font-bebas text-xl text-right ${isTop3 || isCurrentUser ? 'text-neon' : 'text-white'}`}>
        {entry.total_points}
      </div>

      {/* Predictions played */}
      <div className="text-center text-sm text-[#888]">{entry.total_predictions}</div>

      {/* Exact results */}
      <div className="text-center text-sm text-[#888]">{entry.correct_results}</div>

      {/* Correct winners */}
      <div className="text-center text-sm text-[#888]">{entry.correct_winners}</div>
    </div>
  )
}

function RankTrend({ entry }: { entry: LeaderboardEntry }) {
  if (!entry.previous_rank || entry.previous_rank === entry.rank) {
    return <Minus size={16} className="text-[#555]" />
  }
  if (entry.previous_rank > entry.rank) {
    return (
      <div className="flex items-center gap-1 text-neon">
        <TrendingUp size={16} />
        <span className="text-xs font-bold">+{entry.previous_rank - entry.rank}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-red-400">
      <TrendingDown size={16} />
      <span className="text-xs font-bold">{entry.previous_rank - entry.rank}</span>
    </div>
  )
}
