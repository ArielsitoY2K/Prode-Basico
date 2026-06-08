// app/api/webhook/route.ts
// Receives webhooks from SportsAPIPro for real-time events

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabase } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let body: { type: string; match_id: number; data: Record<string, unknown> }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { type, match_id: apiMatchId, data } = body
  const { data: match } = await supabase.from('matches').select('id, home_team_id, away_team_id').eq('api_id', apiMatchId).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  try {
    switch (type) {
      case 'match.started':
        await supabase.from('matches').update({ status: 'live', minute: 0, updated_at: new Date().toISOString() }).eq('id', match.id)
        break
      case 'match.halftime':
        await supabase.from('matches').update({ status: 'halftime', home_score_ht: data.home_score, away_score_ht: data.away_score, updated_at: new Date().toISOString() }).eq('id', match.id)
        break
      case 'match.finished':
        await supabase.from('matches').update({ status: 'finished', home_score: data.home_score, away_score: data.away_score, minute: 90, updated_at: new Date().toISOString() }).eq('id', match.id)
        break
      case 'match.score_update':
        await supabase.from('matches').update({ home_score: data.home_score, away_score: data.away_score, minute: data.minute, updated_at: new Date().toISOString() }).eq('id', match.id)
        break
      case 'match.goal':
      case 'match.yellow_card':
      case 'match.red_card':
      case 'match.substitution': {
        const eventType = type.replace('match.', '')
        const { data: team } = await supabase.from('teams').select('id').eq('api_id', data.team_id).single()
        await supabase.from('match_events').insert({ match_id: match.id, type: eventType, team_id: team?.id || null, player_name: data.player || '', minute: data.minute, extra_minute: data.extra_minute || null })
        break
      }
      default: console.log('Unknown webhook type:', type)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
