import { Match } from '@/types'
import { formatMatchDate, formatMatchTime } from '@/lib/utils'
import Image from 'next/image'

interface MatchCardProps {
  match: Match
  compact?: boolean
}

export function MatchCard({ match, compact = false }: MatchCardProps) {
  const isLive = match.status === 'live' || match.status === 'halftime'
  const isFinished = match.status === 'finished'
  const hasScore = match.home_score !== null && match.away_score !== null

  return (
    <div className={`match-card p-4 ${isLive ? 'live' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#555] font-medium">
            {formatMatchDate(match.match_date)}
          </span>
          {match.group && (
            <span className="text-xs text-[#444] uppercase">
              · GRUPO {match.group.code}
            </span>
          )}
          {!match.group && match.round_name && (
            <span className="text-xs text-[#444] uppercase">
              · {match.round_name}
            </span>
          )}
        </div>

        {isLive && (
          <span className="badge-live text-xs font-bold px-2 py-0.5 rounded-full">
            {match.status === 'halftime' ? 'HT' : `${match.minute || 0}'`}
          </span>
        )}
        {isFinished && (
          <span className="text-xs text-[#555] font-medium">FINALIZADO</span>
        )}
        {!isLive && !isFinished && (
          <span className="text-xs text-[#555]">{formatMatchTime(match.match_date)}</span>
        )}
      </div>

      {/* Teams and Score */}
      <div className="flex items-center justify-between gap-4">
        {/* Home Team */}
        <div className="flex items-center gap-3 flex-1">
          <TeamFlag team={match.home_team} />
          <span className={`font-semibold text-sm md:text-base ${compact ? 'truncate max-w-[80px]' : ''}`}>
            {compact ? (match.home_team?.short_name || match.home_team?.name) : match.home_team?.name}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1 shrink-0">
          {hasScore ? (
            <>
              <ScoreBox score={match.home_score!} isWinner={match.home_score! > match.away_score!} />
              <span className="text-[#555] px-1">:</span>
              <ScoreBox score={match.away_score!} isWinner={match.away_score! > match.home_score!} />
            </>
          ) : (
            <span className="font-bebas text-2xl text-[#333] tracking-wider">VS</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className={`font-semibold text-sm md:text-base ${compact ? 'truncate max-w-[80px]' : ''} text-right`}>
            {compact ? (match.away_team?.short_name || match.away_team?.name) : match.away_team?.name}
          </span>
          <TeamFlag team={match.away_team} />
        </div>
      </div>
    </div>
  )
}

function TeamFlag({ team }: { team?: { flag_url?: string; short_name?: string; name?: string } | null }) {
  if (!team) return <div className="w-7 h-5 bg-[#222] rounded" />

  if (team.flag_url) {
    return (
      <img
        src={team.flag_url}
        alt={team.name}
        className="flag-img"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
        }}
      />
    )
  }

  // Fallback: first 2 letters
  return (
    <div className="w-7 h-5 bg-[#222] rounded flex items-center justify-center">
      <span className="text-[9px] font-bold text-[#666]">
        {(team.short_name || team.name || '?').substring(0, 2)}
      </span>
    </div>
  )
}

function ScoreBox({ score, isWinner }: { score: number; isWinner: boolean }) {
  return (
    <div className={`w-8 h-8 flex items-center justify-center rounded font-bold text-lg ${
      isWinner ? 'text-neon' : 'text-white'
    }`}>
      {score}
    </div>
  )
}
