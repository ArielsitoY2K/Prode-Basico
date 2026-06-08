// app/api/cron/route.ts - Vercel Cron, every 60 min, max 20 requests/day

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { fetchLiveAndRecentMatches, fetchGroupStandings } from '@/lib/api/sportsapi'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: config } = await supabase.from('app_config').select('key, value').in('key', ['tournament_finished', 'daily_requests_used', 'daily_requests_reset'])
  const configMap = Object.fromEntries(config?.map(c => [c.key, c.value]) || [])

  if (configMap['tournament_finished'] === 'true') {
    return NextResponse.json({ message: 'Tournament finished, cron disabled' })
  }

  const resetDate = new Date(configMap['daily_requests_reset'] || 0)
  const now = new Date()
  let dailyUsed = parseInt(configMap['daily_requests_used'] || '0')

  if (now.toDateString() !== resetDate.toDateString()) {
    dailyUsed = 0
    await supabase.from('app_config').upsert([
      { key: 'daily_requests_used', value: '0', updated_at: now.toISOString() },
      { key: 'daily_requests_reset', value: now.toISOString(), updated_at: now.toISOString() },
    ], { onConflict: 'key' })
  }

  if (dailyUsed >= 20) {
    return NextResponse.json({ message: 'Daily API limit reached', used: dailyUsed })
  }

  const { data: activeMatches } = await supabase
    .from('matches').select('id, api_id, status')
    .in('status', ['scheduled', 'live', 'halftime'])
    .lte('match_date', new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString())
    .limit(20)

  if (!activeMatches || activeMatches.length === 0) {
    return NextResponse.json({ message: 'No active matches to sync' })
  }

  const results = { updated: 0, requests: 0, errors: [] as string[] }

  try {
    const matches = await fetchLiveAndRecentMatches()
    results.requests++

    for (const m of matches) {
      const status = normalizeStatus(m.status)
      await supabase.from('matches').update({
        status, home_score: m.home_score ?? null, away_score: m.away_score ?? null,
        home_score_ht: m.home_score_ht ?? null, away_score_ht: m.away_score_ht ?? null,
        minute: m.minute ?? null, updated_at: new Date().toISOString(),
      }).eq('api_id', m.id)
      results.updated++
    }

    if (dailyUsed + results.requests < 18) {
      const groups = await fetchGroupStandings()
      results.requests++
      for (const g of groups) {
        const { data: groupData } = await supabase.from('groups').select('id').eq('api_id', g.id).single()
        if (!groupData || !g.standings) continue
        for (const standing of g.standings) {
          const { data: teamData } = await supabase.from('teams').select('id').eq('api_id', standing.team.id).single()
          if (!teamData) continue
          await supabase.from('group_standings').upsert({
            group_id: groupData.id, team_id: teamData.id,
            played: standing.played, won: standing.won, drawn: standing.drawn, lost: standing.lost,
            goals_for: standing.goals_for, goals_against: standing.goals_against,
            points: standing.points, position: standing.position, updated_at: new Date().toISOString(),
          }, { onConflict: 'group_id,team_id' })
        }
      }
    }

    const newTotal = dailyUsed + results.requests
    await supabase.from('app_config').upsert({ key: 'daily_requests_used', value: String(newTotal), updated_at: now.toISOString() }, { onConflict: 'key' })
    await supabase.from('sync_log').insert({ sync_type: 'cron', requests_used: results.requests, records_updated: results.updated })

    return NextResponse.json({ success: true, results, dailyTotal: newTotal })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function normalizeStatus(status: string): string {
  const map: Record<string, string> = { not_started: 'scheduled', scheduled: 'scheduled', in_progress: 'live', live: 'live', half_time: 'halftime', halftime: 'halftime', finished: 'finished', ft: 'finished' }
  return map[status?.toLowerCase()] || 'scheduled'
}
