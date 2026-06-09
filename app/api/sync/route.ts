// app/api/sync/route.ts
// Initial sync: teams, groups, fixture
// Call ONCE on deployment: POST /api/sync?secret=CRON_SECRET

// 🚀 OBLIGA A VERCEL A DEJAR EL ENDPOINT VIVO COMO FUNCIÓN DE SERVIDOR DINÁMICA
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
    // 1. Sincronizar Grupos (A-L creados dinámicamente)
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

    // MAPA DE GRUPOS EN MEMORIA: Traemos los UUIDs reales generados en Supabase
    // Esto evita hacer un select .single() dentro de los bucles repetitivos
    const { data: dbGroups } = await supabase.from('groups').select('id, code, api_id')
    const groupsMapByCode: Record<string, string> = {} // code -> uuid
    const groupsMapByApiId: Record<number, string> = {} // api_id -> uuid
    
    dbGroups?.forEach(g => {
      groupsMapByCode[g.code] = g.id
      groupsMapByApiId[g.api_id] = g.id
    })

    // 2. Sincronizar Equipos (Cruzando el código de grupo directo del objeto t.group)
    const teams = await fetchAllTeams()
    for (const t of teams) {
      // Obtenemos la letra del grupo desde el objeto nativo que inyecta el adaptador de la API V2
      const groupLetter = (t as any).group_name?.replace(/Grupo |Group /gi, '').trim().charAt(