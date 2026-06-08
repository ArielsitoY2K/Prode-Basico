'use client'

import { useState } from 'react'
import { Match, Group } from '@/types'
import { MatchCard } from '@/components/matches/MatchCard'
import { getPhaseLabel, formatFullDate } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type PhaseFilter = 'all' | 'group' | 'knockout'
type TabFilter = 'all' | 'today' | 'tomorrow' | 'upcoming'

interface FixtureClientProps {
  matches: Match[]
  groups: Group[]
}

export function FixtureClient({ matches, groups }: FixtureClientProps) {
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [tabFilter, setTabFilter] = useState<TabFilter>('all')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const filtered = matches.filter(match => {
    const matchDate = new Date(match.match_date)
    const matchDay = new Date(matchDate)
    matchDay.setHours(0, 0, 0, 0)

    // Tab filter
    if (tabFilter === 'today' && matchDay.getTime() !== today.getTime()) return false
    if (tabFilter === 'tomorrow' && matchDay.getTime() !== tomorrow.getTime()) return false
    if (tabFilter === 'upcoming' && matchDay.getTime() <= today.getTime()) return false

    // Phase filter
    if (phaseFilter === 'group' && match.phase !== 'group') return false
    if (phaseFilter === 'knockout' && match.phase === 'group') return false

    // Group filter
    if (groupFilter !== 'all' && match.group_id !== groupFilter) return false

    return true
  })

  // Group by date
  const byDate = filtered.reduce((acc, match) => {
    const dateKey = format(new Date(match.match_date), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(match)
    return acc
  }, {} as Record<string, Match[]>)

  const sortedDates = Object.keys(byDate).sort()

  return (
    <div>
      <h1 className="font-bebas text-4xl text-white mb-6">FIXTURE COMPLETO</h1>

      {/* Time tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {([
          { value: 'all', label: 'TODOS' },
          { value: 'today', label: 'HOY' },
          { value: 'tomorrow', label: 'MAÑANA' },
          { value: 'upcoming', label: 'PRÓXIMOS' },
        ] as const).map(tab => (
          <button
            key={tab.value}
            onClick={() => setTabFilter(tab.value)}
            className={`px-4 py-2 text-xs font-bold rounded whitespace-nowrap transition-all ${
              tabFilter === tab.value
                ? 'bg-neon text-black'
                : 'bg-[#111] text-[#888] border border-[#222] hover:border-[#444] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Phase/Group filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <select
          value={phaseFilter}
          onChange={e => {
            setPhaseFilter(e.target.value as PhaseFilter)
            setGroupFilter('all')
          }}
          className="input-dark text-sm py-2 w-auto min-w-[140px]"
        >
          <option value="all">Todas las fases</option>
          <option value="group">Fase de Grupos</option>
          <option value="knockout">Fase Eliminatoria</option>
        </select>

        {phaseFilter !== 'knockout' && groups.length > 0 && (
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="input-dark text-sm py-2 w-auto min-w-[130px]"
          >
            <option value="all">Todos los grupos</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>GRUPO {g.code}</option>
            ))}
          </select>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-[#555] mb-4">
        {filtered.length} partido{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Matches by date */}
      {sortedDates.length === 0 ? (
        <div className="card-dark p-8 text-center">
          <p className="text-[#555]">No hay partidos con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(dateKey => (
            <div key={dateKey}>
              <div className="text-xs font-bold text-[#555] uppercase tracking-widest mb-3">
                {format(new Date(dateKey), "EEEE d 'de' MMMM", { locale: es }).toUpperCase()}
              </div>
              <div className="space-y-2">
                {byDate[dateKey].map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
