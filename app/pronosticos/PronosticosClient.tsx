'use client'

import { useState, useMemo } from 'react'
import { Match, Group } from '@/types'
import { saveBatchPredictions } from '@/lib/api/actions'
import { formatMatchDate, formatMatchTime, getPhaseLabel, timeUntilMatch } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, Lock, Check, Save } from 'lucide-react'

interface PredictionEntry {
  home_score: string
  away_score: string
}

interface PronosticosClientProps {
  matches: Match[]
  groups: Group[]
  predictionsMap: Record<string, { home_score: number; away_score: number; points_earned?: number | null }>
}

export function PronosticosClient({ matches, groups, predictionsMap }: PronosticosClientProps) {
  // Initialize local predictions from existing ones
  const [localPreds, setLocalPreds] = useState<Record<string, PredictionEntry>>(() => {
    const init: Record<string, PredictionEntry> = {}
    for (const [matchId, pred] of Object.entries(predictionsMap)) {
      init[matchId] = {
        home_score: String(pred.home_score),
        away_score: String(pred.away_score),
      }
    }
    return init
  })

  const [selectedGroup, setSelectedGroup] = useState<string>(groups[0]?.id || 'all')
  const [selectedPhase, setSelectedPhase] = useState<string>('group')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success?: boolean; error?: string; count?: number } | null>(null)

  const now = new Date()

  // Filter matches
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (selectedPhase === 'group') {
        if (m.phase !== 'group') return false
        if (selectedGroup !== 'all' && m.group_id !== selectedGroup) return false
      } else {
        if (m.phase === 'group') return false
      }
      return true
    }).sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  }, [matches, selectedPhase, selectedGroup])

  // Group by round/date
  const byRound = useMemo(() => {
    const acc: Record<string, Match[]> = {}
    filteredMatches.forEach(m => {
      const key = selectedPhase === 'group'
        ? `Fecha ${m.round}`
        : getPhaseLabel(m.phase)
      if (!acc[key]) acc[key] = []
      acc[key].push(m)
    })
    return acc
  }, [filteredMatches, selectedPhase])

  function setScore(matchId: string, field: 'home_score' | 'away_score', val: string) {
    const num = val === '' ? '' : String(Math.max(0, Math.min(20, parseInt(val) || 0)))
    setLocalPreds(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: num },
    }))
  }

  // Count unsaved open matches
  const openPendingCount = useMemo(() => {
    return filteredMatches.filter(m => {
      if (new Date(m.match_date) <= now || m.status !== 'scheduled') return false
      const p = localPreds[m.id]
      return p?.home_score !== '' && p?.away_score !== ''
    }).length
  }, [filteredMatches, localPreds, now])

  async function handleSaveAll() {
    setSaving(true)
    setSaveResult(null)

    const toSave = filteredMatches
      .filter(m => {
        if (new Date(m.match_date) <= now || m.status !== 'scheduled') return false
        const p = localPreds[m.id]
        return p?.home_score !== '' && p?.home_score !== undefined && p?.away_score !== '' && p?.away_score !== undefined
      })
      .map(m => ({
        matchId: m.id,
        homeScore: parseInt(localPreds[m.id].home_score),
        awayScore: parseInt(localPreds[m.id].away_score),
      }))

    if (toSave.length === 0) {
      setSaveResult({ error: 'No hay pronósticos para guardar' })
      setSaving(false)
      return
    }

    const result = await saveBatchPredictions(toSave)
    setSaving(false)
    if (result?.error) {
      setSaveResult({ error: result.error })
    } else {
      setSaveResult({ success: true, count: result.saved })
      setTimeout(() => setSaveResult(null), 4000)
    }
  }

  const roundKeys = Object.keys(byRound)

  // Countdown for next unlocked match
  const nextMatch = filteredMatches.find(m => m.status === 'scheduled' && new Date(m.match_date) > now)
  const countdown = nextMatch ? timeUntilMatch(nextMatch.match_date) : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="font-bebas text-4xl text-white">PRONÓSTICOS</h1>
          <p className="text-[#555] text-sm mt-1">
            {selectedPhase === 'group' ? 'FASE DE GRUPOS' : 'FASE ELIMINATORIA'}
            {selectedGroup !== 'all' && selectedPhase === 'group' && ` · GRUPO ${groups.find(g => g.id === selectedGroup)?.code}`}
          </p>
        </div>

        {/* Countdown */}
        {countdown && (
          <div className="card-dark px-4 py-3 shrink-0 text-right">
            <div className="text-xs text-[#555] mb-1">FECHA LÍMITE</div>
            <div className="flex items-baseline gap-1">
              {countdown.days > 0 && (
                <><span className="countdown-digit text-2xl">{countdown.days}</span><span className="text-xs text-[#555] mr-2">D</span></>
              )}
              <span className="countdown-digit text-2xl">{String(countdown.hours).padStart(2,'0')}</span>
              <span className="text-xs text-[#555] mr-2">HS</span>
              <span className="countdown-digit text-2xl">{String(countdown.minutes).padStart(2,'0')}</span>
              <span className="text-xs text-[#555]">MIN</span>
            </div>
          </div>
        )}
      </div>

      {/* Phase selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSelectedPhase('group')}
          className={`px-4 py-2 text-xs font-bold rounded transition-all ${selectedPhase === 'group' ? 'bg-neon text-black' : 'bg-[#111] text-[#888] border border-[#222] hover:border-[#444] hover:text-white'}`}
        >
          FASE DE GRUPOS
        </button>
        <button
          onClick={() => setSelectedPhase('knockout')}
          className={`px-4 py-2 text-xs font-bold rounded transition-all ${selectedPhase === 'knockout' ? 'bg-neon text-black' : 'bg-[#111] text-[#888] border border-[#222] hover:border-[#444] hover:text-white'}`}
        >
          ELIMINATORIAS
        </button>
      </div>

      {/* Group selector */}
      {selectedPhase === 'group' && groups.length > 0 && (
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded whitespace-nowrap transition-all ${selectedGroup === 'all' ? 'bg-neon text-black' : 'text-[#555] hover:text-white'}`}
          >
            TODOS
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded whitespace-nowrap transition-all ${selectedGroup === g.id ? 'bg-neon text-black' : 'text-[#555] hover:text-white'}`}
            >
              GRP {g.code}
            </button>
          ))}
        </div>
      )}

      {/* Points system reminder */}
      <div className="flex gap-3 mb-6 overflow-x-auto">
        {[
          { pts: '+3', label: 'RESULTADO EXACTO', color: 'text-neon' },
          { pts: '+1', label: 'GANADOR / EMPATE', color: 'text-blue-400' },
          { pts: '0', label: 'ERROR', color: 'text-[#555]' },
        ].map(p => (
          <div key={p.pts} className="card-dark px-3 py-2 flex items-center gap-2 whitespace-nowrap">
            <span className={`font-bebas text-xl ${p.color}`}>{p.pts}</span>
            <span className="text-xs text-[#555]">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Match rounds */}
      {roundKeys.length === 0 ? (
        <div className="card-dark p-8 text-center">
          <p className="text-[#555]">No hay partidos para este filtro aún.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {roundKeys.map(roundKey => (
            <div key={roundKey}>
              <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest mb-3">
                {selectedPhase === 'group' ? `FASE DE GRUPOS · ${roundKey.toUpperCase()}` : roundKey.toUpperCase()}
              </h2>
              <div className="space-y-2">
                {byRound[roundKey].map(match => (
                  <MatchPredRow
                    key={match.id}
                    match={match}
                    prediction={localPreds[match.id]}
                    savedPrediction={predictionsMap[match.id]}
                    onChange={(field, val) => setScore(match.id, field, val)}
                    isLocked={new Date(match.match_date) <= now || match.status !== 'scheduled'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-0 mt-8 py-4 bg-black border-t border-[#1a1a1a]">
        <div className="flex items-center justify-between gap-4">
          {saveResult ? (
            <div className={`text-sm font-semibold flex items-center gap-2 ${saveResult.success ? 'text-neon' : 'text-red-400'}`}>
              {saveResult.success ? (
                <><Check size={16} />{saveResult.count} pronóstico{saveResult.count !== 1 ? 's' : ''} guardado{saveResult.count !== 1 ? 's' : ''}</>
              ) : (
                saveResult.error
              )}
            </div>
          ) : (
            <span className="text-sm text-[#555]">
              {openPendingCount > 0 ? `${openPendingCount} pronóstico${openPendingCount !== 1 ? 's' : ''} por guardar` : 'Completá los resultados arriba'}
            </span>
          )}
          <button
            onClick={handleSaveAll}
            disabled={saving || openPendingCount === 0}
            className="btn-neon px-6 py-3 rounded font-bold text-sm flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'GUARDANDO...' : 'GUARDAR PRONÓSTICOS'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface MatchPredRowProps {
  match: Match
  prediction?: PredictionEntry
  savedPrediction?: { home_score: number; away_score: number; points_earned?: number | null }
  onChange: (field: 'home_score' | 'away_score', val: string) => void
  isLocked: boolean
}

function MatchPredRow({ match, prediction, savedPrediction, onChange, isLocked }: MatchPredRowProps) {
  const isLive = match.status === 'live' || match.status === 'halftime'
  const isFinished = match.status === 'finished'
  const hasResult = match.home_score !== null && match.away_score !== null

  return (
    <div className={`match-card p-4 ${isLive ? 'live' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-[#555]">
          {formatMatchDate(match.match_date)}
          {match.group && ` · GRUPO ${match.group.code}`}
        </div>
        <div className="flex items-center gap-2">
          {isLocked && !isLive && !isFinished && (
            <span className="flex items-center gap-1 text-xs text-[#555]"><Lock size={10} />CERRADO</span>
          )}
          {isLive && (
            <span className="badge-live text-xs font-bold px-2 py-0.5 rounded-full">
              {match.status === 'halftime' ? 'HT' : `${match.minute || 0}'`}
            </span>
          )}
          {isFinished && (
            <span className="text-xs text-[#555]">FINALIZADO</span>
          )}
          {!isLocked && (
            <span className="text-xs text-neon font-semibold">{formatMatchTime(match.match_date)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamFlag team={match.home_team} />
          <span className="font-semibold text-sm truncate">{match.home_team?.name}</span>
        </div>

        {/* Inputs / Display */}
        <div className="flex items-center gap-2 shrink-0">
          {isLocked ? (
            <div className="flex items-center gap-2">
              {/* Show prediction */}
              <div className="flex items-center gap-1">
                <div className="score-input flex items-center justify-center text-[#555]">
                  {savedPrediction?.home_score ?? '-'}
                </div>
                <span className="text-[#555]">:</span>
                <div className="score-input flex items-center justify-center text-[#555]">
                  {savedPrediction?.away_score ?? '-'}
                </div>
              </div>
              {/* Show actual result if finished */}
              {hasResult && (
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-xs text-[#555]">Real:</span>
                  <span className="font-bebas text-base text-white">{match.home_score} - {match.away_score}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <input
                type="number"
                min="0"
                max="20"
                className="score-input"
                value={prediction?.home_score ?? ''}
                onChange={e => onChange('home_score', e.target.value)}
                placeholder="0"
              />
              <span className="text-[#555]">:</span>
              <input
                type="number"
                min="0"
                max="20"
                className="score-input"
                value={prediction?.away_score ?? ''}
                onChange={e => onChange('away_score', e.target.value)}
                placeholder="0"
              />
            </>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-semibold text-sm truncate text-right">{match.away_team?.name}</span>
          <TeamFlag team={match.away_team} />
        </div>
      </div>

      {/* Points badge */}
      {savedPrediction?.points_earned !== null && savedPrediction?.points_earned !== undefined && (
        <div className="mt-2 flex justify-end">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            savedPrediction.points_earned === 3
              ? 'bg-neon/20 text-neon border border-neon/30'
              : savedPrediction.points_earned === 1
              ? 'bg-blue-900/30 text-blue-400 border border-blue-800'
              : 'bg-[#1a1a1a] text-[#555] border border-[#222]'
          }`}>
            {savedPrediction.points_earned === 3 ? '⭐ +3 EXACTO'
              : savedPrediction.points_earned === 1 ? '✓ +1'
              : '✗ 0 pts'}
          </span>
        </div>
      )}
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
