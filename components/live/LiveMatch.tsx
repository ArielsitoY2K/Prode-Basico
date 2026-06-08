'use client'

import { useState, useCallback } from 'react'
import { Match, MatchEvent, WSMatchUpdate, WSIncident } from '@/types'
import { useMatchWebSocket } from '@/lib/hooks/useWebSocket'
import { Zap } from 'lucide-react'

interface LiveMatchProps {
  match: Match
  events: MatchEvent[]
}

export function LiveMatch({ match: initialMatch, events: initialEvents }: LiveMatchProps) {
  const [match, setMatch] = useState(initialMatch)
  const [events, setEvents] = useState(initialEvents)

  const isActive = match.status === 'live' || match.status === 'halftime'

  const handleMatchUpdate = useCallback((update: WSMatchUpdate) => {
    setMatch(prev => ({
      ...prev,
      home_score: update.home_score ?? prev.home_score,
      away_score: update.away_score ?? prev.away_score,
      minute: update.minute ?? prev.minute,
      status: (update.status as Match['status']) ?? prev.status,
    }))
  }, [])

  const handleIncident = useCallback((incident: WSIncident) => {
    const newEvent: MatchEvent = {
      id: Date.now().toString(),
      match_id: match.id,
      type: incident.type as MatchEvent['type'],
      team_id: '',
      player_name: incident.player,
      minute: incident.minute,
      created_at: new Date().toISOString(),
    }
    setEvents(prev => [newEvent, ...prev])
  }, [match.id])

  const { connected } = useMatchWebSocket({
    matchIds: isActive ? [match.api_id] : [],
    onMatchUpdate: handleMatchUpdate,
    onIncident: handleIncident,
    enabled: isActive,
  })

  return (
    <div className="card-dark p-6">
      {/* Live indicator */}
      {isActive && (
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-neon" />
          <span className="badge-live text-xs font-bold px-2 py-0.5 rounded-full">
            {match.status === 'halftime' ? 'MEDIO TIEMPO' : `EN VIVO · ${match.minute}'`}
          </span>
          {connected && (
            <span className="text-xs text-[#555]">· Actualización en tiempo real</span>
          )}
        </div>
      )}

      {/* Score Display */}
      <div className="flex items-center justify-center gap-8 py-4">
        <TeamDisplay team={match.home_team} />

        <div className="text-center">
          {match.home_score !== null && match.away_score !== null ? (
            <div className="font-bebas text-6xl md:text-8xl tracking-wider">
              <span className={(match.home_score ?? 0) > (match.away_score ?? 0) ? 'text-neon' : 'text-white'}>
                {match.home_score}
              </span>
              <span className="text-[#333] mx-2">:</span>
              <span className={(match.away_score ?? 0) > (match.home_score ?? 0) ? 'text-neon' : 'text-white'}>
                {match.away_score}
              </span>
            </div>
          ) : (
            <div className="font-bebas text-4xl text-[#333]">VS</div>
          )}
          {match.home_score_ht !== null && match.away_score_ht !== null && (
            <div className="text-xs text-[#555] mt-1">
              HT: {match.home_score_ht} - {match.away_score_ht}
            </div>
          )}
        </div>

        <TeamDisplay team={match.away_team} />
      </div>

      {/* Events */}
      {events.length > 0 && (
        <div className="mt-6 border-t border-[#1a1a1a] pt-4">
          <h3 className="text-xs text-[#555] font-semibold uppercase tracking-wider mb-3">Incidentes</h3>
          <div className="space-y-2">
            {events.slice(0, 10).map(event => (
              <EventRow key={event.id} event={event} homeTeamId={match.home_team_id} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TeamDisplay({ team }: { team?: Match['home_team'] }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      {team?.flag_url ? (
        <img src={team.flag_url} alt={team.name} className="w-12 h-8 object-cover rounded" />
      ) : (
        <div className="w-12 h-8 bg-[#1a1a1a] rounded" />
      )}
      <span className="font-semibold text-sm text-center">{team?.name}</span>
    </div>
  )
}

function EventRow({ event, homeTeamId }: { event: MatchEvent; homeTeamId: string }) {
  const isHome = event.team_id === homeTeamId
  const icon = {
    goal: '⚽',
    own_goal: '⚽',
    yellow_card: '🟨',
    red_card: '🟥',
    substitution: '🔄',
    penalty: '⚽',
  }[event.type] || '•'

  return (
    <div className={`flex items-center gap-3 text-sm ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
      <span className="text-base">{icon}</span>
      <span className="text-[#888]">{event.minute}'</span>
      <span className="text-white">{event.player_name}</span>
      {event.type === 'own_goal' && <span className="text-xs text-[#555]">(PP)</span>}
    </div>
  )
}
