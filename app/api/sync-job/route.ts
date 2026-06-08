// app/api/sync-job/route.ts
//
// Este endpoint es llamado por la Supabase Edge Function "sync-scheduler"
// cada 60 minutos via pg_cron. NO usa Vercel Cron (limitado a 1x/día en plan free).
//
// Autenticación: header Authorization: Bearer CRON_SECRET
// Máximo consumo permitido: 20 requests/día a SportsAPIPro

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { fetchLiveAndRecentMatches, fetchGroupStandings } from '@/lib/api/sportsapi'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Verificar secret enviado por la Edge Function de Supabase
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()

  // ── 1. Leer configuración ────────────────────────────────────────────────
  const { data: config } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['tournament_finished', 'daily_requests_used', 'daily_requests_reset'])

  const cfg = Object.fromEntries(config?.map(c => [c.key, c.value]) ?? [])

  // Si el torneo terminó, no hacer nada
  if (cfg['tournament_finished'] === 'true') {
    return NextResponse.json({ skipped: true, reason: 'tournament_finished' })
  }

  // ── 2. Control de cuota diaria ───────────────────────────────────────────
  const resetDate = new Date(cfg['daily_requests_reset'] ?? 0)
  let dailyUsed = parseInt(cfg['daily_requests_used'] ?? '0', 10)

  // Resetear contador al inicio del nuevo día (UTC)
  if (now.toUTCString().slice(0, 16) !== resetDate.toUTCString().slice(0, 16)) {
    dailyUsed = 0
    await supabase.from('app_config').upsert([
      { key: 'daily_requests_used', value: '0', updated_at: now.toISOString() },
      { key: 'daily_requests_reset', value: now.toISOString(), updated_at: now.toISOString() },
    ], { onConflict: 'key' })
  }

  if (dailyUsed >= 20) {
    return NextResponse.json({ skipped: true, reason: 'daily_limit_reached', used: dailyUsed })
  }

  // ── 3. Verificar si hay partidos activos o próximos (3h) ─────────────────
  const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString()

  const { data: activeMatches, count } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .in('status', ['live', 'halftime', 'scheduled'])
    .lte('match_date', windowEnd)

  if (!count || count === 0) {
    return NextResponse.json({ skipped: true, reason: 'no_active_matches' })
  }

  // ── 4. Sincronizar partidos en curso / recientes ─────────────────────────
  const results = { requests: 0, matches_updated: 0, standings_updated: 0, errors: [] as string[] }

  try {
    const liveMatches = await fetchLiveAndRecentMatches()
    results.requests++

    for (const m of liveMatches) {
      const { error } = await supabase
        .from('matches')
        .update({
          status: normalizeStatus(m.status),
          home_score: m.home_score ?? null,
          away_score: m.away_score ?? null,
          home_score_ht: m.home_score_ht ?? null,
          away_score_ht: m.away_score_ht ?? null,
          minute: m.minute ?? null,
          updated_at: now.toISOString(),
        })
        .eq('api_id', m.id)

      if (!error) results.matches_updated++
      else results.errors.push(`match ${m.id}: ${error.message}`)
    }

    // ── 5. Sincronizar posiciones de grupo (si quedan cuota) ─────────────
    const hasLiveGroupMatches = liveMatches.some(m =>
      ['live', 'halftime', 'finished'].includes(normalizeStatus(m.status))
    )

    if (hasLiveGroupMatches && dailyUsed + results.requests < 18) {
      const groupData = await fetchGroupStandings()
      results.requests++

      for (const g of groupData) {
        if (!g.standings?.length) continue

        const { data: grp } = await supabase
          .from('groups').select('id').eq('api_id', g.id).single()
        if (!grp) continue

        for (const s of g.standings) {
          const { data: team } = await supabase
            .from('teams').select('id').eq('api_id', s.team.id).single()
          if (!team) continue

          const { error } = await supabase
            .from('group_standings')
            .upsert({
              group_id: grp.id,
              team_id: team.id,
              played: s.played,
              won: s.won,
              drawn: s.drawn,
              lost: s.lost,
              goals_for: s.goals_for,
              goals_against: s.goals_against,
              points: s.points,
              position: s.position,
              updated_at: now.toISOString(),
            }, { onConflict: 'group_id,team_id' })

          if (!error) results.standings_updated++
        }
      }
    }

    // ── 6. Actualizar contador diario y log ──────────────────────────────
    const newTotal = dailyUsed + results.requests
    await supabase.from('app_config').upsert(
      { key: 'daily_requests_used', value: String(newTotal), updated_at: now.toISOString() },
      { onConflict: 'key' }
    )
    await supabase.from('sync_log').insert({
      sync_type: 'scheduled',
      requests_used: results.requests,
      records_updated: results.matches_updated + results.standings_updated,
    })

    // ── 7. Auto-detectar fin del torneo ──────────────────────────────────
    const { count: pending } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .in('status', ['scheduled', 'live', 'halftime'])

    if (pending === 0) {
      await supabase.from('app_config').upsert(
        { key: 'tournament_finished', value: 'true', updated_at: now.toISOString() },
        { onConflict: 'key' }
      )
    }

    return NextResponse.json({
      success: true,
      results,
      daily_requests_total: newTotal,
      tournament_finished: pending === 0,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await supabase.from('sync_log').insert({
      sync_type: 'scheduled',
      requests_used: results.requests,
      error: msg,
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function normalizeStatus(status: string): string {
  const map: Record<string, string> = {
    not_started: 'scheduled',
    scheduled: 'scheduled',
    in_progress: 'live',
    live: 'live',
    half_time: 'halftime',
    halftime: 'halftime',
    finished: 'finished',
    ft: 'finished',
    postponed: 'postponed',
    cancelled: 'cancelled',
  }
  return map[status?.toLowerCase()] ?? 'scheduled'
}
