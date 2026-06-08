'use client'

import { useState } from 'react'
import { Match, Prediction } from '@/types'
import { savePrediction } from '@/lib/api/actions'
import { formatMatchDate, timeUntilMatch } from '@/lib/utils'
import { Check, Lock } from 'lucide-react'

interface PredictionFormProps {
  match: Match
  existingPrediction?: Prediction | null
}

export function PredictionForm({ match, existingPrediction }: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState(existingPrediction?.home_score ?? '')
  const [awayScore, setAwayScore] = useState(existingPrediction?.away_score ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const isLocked = match.status !== 'scheduled' || new Date(match.match_date) <= new Date()
  const timeLeft = timeUntilMatch(match.match_date)

  async function handleSave() {
    if (homeScore === '' || awayScore === '') return
    setLoading(true)
    setError('')

    const result = await savePrediction(match.id, Number(homeScore), Number(awayScore))
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="match-card p-4">
      {/* Match info */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-[#555] font-medium">
          {formatMatchDate(match.match_date)}
          {match.group && ` · GRUPO ${match.group.code}`}
        </div>
        {isLocked && (
          <div className="flex items-center gap-1 text-xs text-[#555]">
            <Lock size={10} />
            <span>CERRADO</span>
          </div>
        )}
        {timeLeft && !isLocked && (
          <div className="text-xs text-[#555]">
            {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}{String(timeLeft.hours).padStart(2,'0')}h {String(timeLeft.minutes).padStart(2,'0')}m
          </div>
        )}
      </div>

      {/* Teams and inputs */}
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex items-center gap-2 flex-1">
          <TeamFlag team={match.home_team} />
          <span className="font-semibold text-sm truncate">{match.home_team?.name}</span>
        </div>

        {/* Score inputs */}
        <div className="flex items-center gap-2 shrink-0">
          {isLocked ? (
            <>
              <div className="score-input flex items-center justify-center opacity-50">
                {existingPrediction?.home_score ?? '-'}
              </div>
              <span className="text-[#555]">:</span>
              <div className="score-input flex items-center justify-center opacity-50">
                {existingPrediction?.away_score ?? '-'}
              </div>
            </>
          ) : (
            <>
              <input
                type="number"
                min="0"
                max="20"
                className="score-input"
                value={homeScore}
                onChange={e => setHomeScore(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />
              <span className="text-[#555]">:</span>
              <input
                type="number"
                min="0"
                max="20"
                className="score-input"
                value={awayScore}
                onChange={e => setAwayScore(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-semibold text-sm truncate text-right">{match.away_team?.name}</span>
          <TeamFlag team={match.away_team} />
        </div>
      </div>

      {/* Save button */}
      {!isLocked && (
        <div className="mt-3 flex items-center justify-between">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={loading || homeScore === '' || awayScore === ''}
            className={`btn-neon px-4 py-2 text-xs font-bold rounded flex items-center gap-2 ${
              saved ? 'bg-green-400' : ''
            }`}
          >
            {saved ? (
              <>
                <Check size={12} />
                GUARDADO
              </>
            ) : loading ? (
              'GUARDANDO...'
            ) : (
              existingPrediction ? 'ACTUALIZAR' : 'GUARDAR'
            )}
          </button>
        </div>
      )}

      {/* Points earned (after match) */}
      {existingPrediction?.points_earned !== null && existingPrediction?.points_earned !== undefined && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <span className="text-xs text-[#555]">Puntos obtenidos:</span>
          <span className={`text-sm font-bold ${
            existingPrediction.points_earned === 3 ? 'text-neon' :
            existingPrediction.points_earned === 1 ? 'text-blue-400' :
            'text-[#555]'
          }`}>
            {existingPrediction.points_earned === 3 ? '+3 ⭐ EXACTO' :
             existingPrediction.points_earned === 1 ? '+1 ✓' :
             '0'}
          </span>
        </div>
      )}
    </div>
  )
}

function TeamFlag({ team }: { team?: { flag_url?: string; name?: string; short_name?: string } | null }) {
  if (!team) return <div className="w-6 h-4 bg-[#222] rounded" />
  if (team.flag_url) return (
    <img src={team.flag_url} alt={team.name} className="w-6 h-4 object-cover rounded" loading="lazy" />
  )
  return (
    <div className="w-6 h-4 bg-[#222] rounded flex items-center justify-center">
      <span className="text-[8px] font-bold text-[#666]">{(team.short_name || team.name || '').substring(0, 2)}</span>
    </div>
  )
}
