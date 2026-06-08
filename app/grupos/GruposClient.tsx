'use client'

import { useState } from 'react'
import { Group, GroupStanding, Match } from '@/types'
import { formatMatchDate, formatMatchTime } from '@/lib/utils'

interface GruposClientProps {
  groups: Group[]
  standings: GroupStanding[]
  matches: Match[]
}

export function GruposClient({ groups, standings, matches }: GruposClientProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>(groups[0]?.id || '')

  const currentGroup = groups.find(g => g.id === selectedGroup)
  const groupStandings = standings
    .filter(s => s.group_id === selectedGroup)
    .sort((a, b) => a.position - b.position || b.points - a.points)
  const groupMatches = matches
    .filter(m => m.group_id === selectedGroup)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-36 shrink-0">
        <h2 className="text-xs font-bold text-[#555] uppercase tracking-wider mb-3">FASE DE GRUPOS</h2>
        <div className="space-y-1">
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm font-semibold transition-all ${
                selectedGroup === group.id
                  ? 'bg-neon text-black'
                  : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              GRUPO {group.code}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {currentGroup ? (
          <>
            <h1 className="font-bebas text-4xl text-white mb-6">
              GRUPO <span className="text-neon">{currentGroup.code}</span>
            </h1>

            {/* Standings table */}
            {groupStandings.length > 0 ? (
              <div className="card-dark overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        <th className="text-left px-4 py-3 text-xs text-[#555] font-semibold uppercase tracking-wider w-8">POS</th>
                        <th className="text-left px-4 py-3 text-xs text-[#555] font-semibold uppercase tracking-wider">SELECCIÓN</th>
                        <th className="text-center px-2 py-3 text-xs text-[#555] font-semibold uppercase w-8">PJ</th>
                        <th className="text-center px-2 py-3 text-xs text-[#555] font-semibold uppercase w-8">PG</th>
                        <th className="text-center px-2 py-3 text-xs text-[#555] font-semibold uppercase w-8">PE</th>
                        <th className="text-center px-2 py-3 text-xs text-[#555] font-semibold uppercase w-8">PP</th>
                        <th className="text-center px-2 py-3 text-xs text-[#555] font-semibold uppercase w-8">GF</th>
                        <th className="text-center px-2 py-3 text-xs text-[#555] font-semibold uppercase w-8">GC</th>
                        <th className="text-center px-2 py-3 text-xs text-[#555] font-semibold uppercase w-8">DG</th>
                        <th className="text-center px-2 py-3 text-xs text-[#555] font-semibold uppercase w-10 text-neon">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupStandings.map((s, i) => (
                        <tr
                          key={s.id}
                          className={`border-b border-[#1a1a1a] last:border-0 hover:bg-[#111] transition-colors ${
                            i < 2 ? 'border-l-2 border-l-neon' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-sm ${i < 2 ? 'text-neon' : 'text-[#555]'}`}>
                              {s.position || i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <TeamFlag team={s.team} />
                              <span className="font-semibold text-white">{s.team?.name}</span>
                            </div>
                          </td>
                          <td className="text-center px-2 py-3 text-[#888]">{s.played}</td>
                          <td className="text-center px-2 py-3 text-[#888]">{s.won}</td>
                          <td className="text-center px-2 py-3 text-[#888]">{s.drawn}</td>
                          <td className="text-center px-2 py-3 text-[#888]">{s.lost}</td>
                          <td className="text-center px-2 py-3 text-[#888]">{s.goals_for}</td>
                          <td className="text-center px-2 py-3 text-[#888]">{s.goals_against}</td>
                          <td className="text-center px-2 py-3 text-[#888]">{s.goal_difference}</td>
                          <td className="text-center px-2 py-3 font-bold text-white">{s.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-[#1a1a1a]">
                  <span className="text-xs text-[#555]">
                    <span className="inline-block w-2 h-2 bg-neon rounded-sm mr-1" />
                    Clasifican a octavos de final
                  </span>
                </div>
              </div>
            ) : (
              <div className="card-dark p-6 mb-6 text-center">
                <p className="text-[#555] text-sm">Las posiciones se mostrarán cuando comiencen los partidos.</p>
              </div>
            )}

            {/* Group matches */}
            <h2 className="font-bebas text-xl text-white mb-3">PARTIDOS</h2>
            {groupMatches.length > 0 ? (
              <div className="space-y-2">
                {groupMatches.map(match => (
                  <GroupMatchRow key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="card-dark p-6 text-center">
                <p className="text-[#555] text-sm">No hay partidos cargados para este grupo.</p>
              </div>
            )}
          </>
        ) : (
          <div className="card-dark p-8 text-center">
            <p className="text-[#555]">Seleccioná un grupo para ver la tabla.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function GroupMatchRow({ match }: { match: Match }) {
  const isLive = match.status === 'live' || match.status === 'halftime'
  const isFinished = match.status === 'finished'
  const hasScore = match.home_score !== null && match.away_score !== null

  return (
    <div className={`match-card px-4 py-3 flex items-center gap-4 ${isLive ? 'live' : ''}`}>
      {/* Date/Time */}
      <div className="w-32 shrink-0">
        <div className="text-xs text-[#555]">{formatMatchDate(match.match_date)}</div>
        {isLive ? (
          <span className="badge-live text-xs font-bold px-1.5 py-0.5 rounded">
            {match.status === 'halftime' ? 'HT' : `${match.minute}'`}
          </span>
        ) : isFinished ? (
          <div className="text-xs text-[#555]">Final</div>
        ) : (
          <div className="text-xs text-neon font-bebas text-base">{formatMatchTime(match.match_date)}</div>
        )}
      </div>

      {/* Home */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TeamFlag team={match.home_team} />
        <span className="text-sm font-semibold truncate">{match.home_team?.name}</span>
      </div>

      {/* Score */}
      <div className="shrink-0 min-w-[60px] text-center">
        {hasScore ? (
          <span className="font-bebas text-xl text-white">
            <span className={match.home_score! > match.away_score! ? 'text-neon' : ''}>{match.home_score}</span>
            {' - '}
            <span className={match.away_score! > match.home_score! ? 'text-neon' : ''}>{match.away_score}</span>
          </span>
        ) : (
          <span className="text-[#333] font-bebas text-xl">-:-</span>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-sm font-semibold truncate text-right">{match.away_team?.name}</span>
        <TeamFlag team={match.away_team} />
      </div>
    </div>
  )
}

function TeamFlag({ team }: { team?: { flag_url?: string; name?: string; short_name?: string } | null }) {
  if (!team) return <div className="w-6 h-4 bg-[#222] rounded shrink-0" />
  if (team.flag_url) return (
    <img src={team.flag_url} alt={team.name} className="w-6 h-4 object-cover rounded shrink-0" loading="lazy" />
  )
  return (
    <div className="w-6 h-4 bg-[#222] rounded flex items-center justify-center shrink-0">
      <span className="text-[8px] font-bold text-[#666]">{(team.short_name || team.name || '').substring(0, 2)}</span>
    </div>
  )
}
