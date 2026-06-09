// app/api/sync/route.ts
// Initial sync: teams, groups, fixture

export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { fetchAllTeams, fetchAllGroups, fetchAllMatches } from '@/lib/api/sportsapi'

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results = { teams: 0, groups: 0, matches: 0, errors: [] as string[] }

  try {
    // 1. Sincronizar Grupos
    const groups = await fetchAllGroups()
    for (const g of groups) {
      const code = g.name.replace(/Grupo |Group /gi, '').trim().charAt(0)
      const { error } = await supabase.from('groups').upsert(
        { api_id: g.id, name: g.name, code },
        { onConflict: 'api_id' }
      )
      if (!error) results.groups++
      else results.errors.push(`Group ${g.name}: ${error.message}`)
    }

    // MAPA DE GRUPOS EN MEMORIA
    const { data: dbGroups } = await supabase.from('groups').select('id, code, api_id')
    const groupsMapByCode: Record<string, string> = {}
    const groupsMapByApiId: Record<number, string> = {}
    
    dbGroups?.forEach(g => {
      groupsMapByCode[g.code] = g.id
      groupsMapByApiId[g.api_id] = g.id
    })

    // 2. Sincronizar Equipos
    const teams = await fetchAllTeams()
    for (const t of teams) {
      const rawGroupName = (t as any).group_name || ''
      const cleanGroupName = rawGroupName.replaceAll('Grupo ', '').replaceAll('Group ', '').trim()
      const groupLetter = cleanGroupName.charAt(0) || (t as any).group?.code || null
      const groupUUID = groupLetter ? groupsMapByCode[groupLetter] : null

      const { error } = await supabase.from('teams').upsert(
        { 
          api_id: t.id, 
          name: t.name, 
          short_name: t.short_name || t.name.substring(0, 3).toUpperCase(), 
          country: t.country, 
          flag_url: t.logo || '', 
          group_id: groupUUID 
        },
        { onConflict: 'api_id' }
      )
      if (!error) results.teams++
      else results.errors.push(`Team ${t.name}: ${error.message}`)
    }

    // MAPA DE EQUIPOS EN MEMORIA
    const { data: dbTeams } = await supabase.from('teams').select('id, api_id, group_id')
    const teamsMap: Record<number, { id: string, group_id: string | null }> = {}
    dbTeams?.forEach(t => {
      teamsMap[t.api_id] = { id: t.id, group_id: t.group_id }
    })

    // 3. Inicializar Tablas de Posiciones
    if (dbTeams) {
      for (const t of dbTeams) {
        if (!t.group_id) continue
        await supabase.from('group_standings').upsert(
          { 
            group_id: t.group_id, 
            team_id: t.id, 
            played: 0, 
            won: 0, 
            drawn: 0, 
            lost: 0, 
            goals_for: 0, 
            goals_against: 0, 
            points: 0, 
            position: 0 
          },
          { onConflict: 'group_id,team_id' }
        )
      }
    }

    // 4. Sincronizar Partidos
    const matches = await fetchAllMatches()
    for (const m of matches) {
      const homeTeam = teamsMap[m.home_team.id]
      const awayTeam = teamsMap[m.away_team.id]
      
      if (!homeTeam || !awayTeam) { 
        results.errors.push(`Match ${m.id}: teams not found (Knockout placeholder)`)
        continue 
      }

      let groupUUID = null
      if (m.group?.id) {
        groupUUID = groupsMapByApiId[m.group.id] || homeTeam.group_id
      } else {
        groupUUID = homeTeam.group_id
      }

      const { error } = await supabase.from('matches').upsert(
        { 
          api_id: m.id, 
          home_team_id: homeTeam.id, 
          away_team_id: awayTeam.id, 
          group_id: groupUUID, 
          phase: normalizePhase(m.phase), 
          round: m.round || 1, 
          round_name: m.round_name || '', 
          match_date: m.date, 
          venue: m.venue, 
          city: m.city, 
          status: normalizeStatus(m.status), 
          home_score: m.home_score ?? null, 
          away_score: m.away_score ?? null, 
          updated_at: new Date().toISOString() 
        },
        { onConflict: 'api_id' }
      )
      if (!error) results.matches++
      else results.errors.push(`Match ${m.id}: ${error.message}`)
    }

    await supabase.from('app_config').upsert({ key: 'initial_sync_done', value: 'true', updated_at: new Date().toISOString() }, { onConflict: 'key' })
    await supabase.from('sync_log').insert({ sync_type: 'initial', requests_used: 3, records_updated: results.teams + results.groups + results.matches })

    return NextResponse.json({ success: true, results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    try {
      await supabase.from('sync_log').insert({ sync_type: 'initial', requests_used: 0, error: message })
    } catch (e) {}
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function normalizePhase(phase: string): string {
  const map: Record<string, string> = { group_stage: 'group', group: 'group', round_of_32: 'round_of_32', round_of_16: 'round_of_16', quarter_finals: 'quarter_final', quarter_final: 'quarter_final', semi_finals: 'semi_final', semi_final: 'semi_final', third_place: 'third_place', final: 'final' }
  return map[phase?.toLowerCase()] || 'group'
}

function normalizeStatus(status: string): string {
  const map: Record<string, string> = { not_started: 'scheduled', scheduled: 'scheduled', in_progress: 'live', live: 'live', half_time: 'halftime', halftime: 'halftime', finished: 'finished', ft: 'finished', postponed: 'postponed', cancelled: 'cancelled' }
  return map[status?.toLowerCase()] || 'scheduled'
}

export async function GET() {
  return NextResponse.json({ mensaje: "El backend está vivo en Vercel, Carlos" })
}