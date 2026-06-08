// supabase/functions/sync-scheduler/index.ts
//
// Supabase Edge Function disparada por pg_cron cada 60 minutos.
// Llama al endpoint /api/sync-job de la app Next.js en Vercel.
//
// Deploy:
//   supabase functions deploy sync-scheduler --no-verify-jwt
//
// Variables de entorno requeridas en Supabase Dashboard → Settings → Edge Functions:
//   APP_URL        → https://tu-app.vercel.app
//   CRON_SECRET    → mismo valor que en Vercel

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (_req: Request) => {
  const appUrl = Deno.env.get('APP_URL')
  const cronSecret = Deno.env.get('CRON_SECRET')

  if (!appUrl || !cronSecret) {
    console.error('Missing APP_URL or CRON_SECRET env vars')
    return new Response(
      JSON.stringify({ error: 'Missing environment variables' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log(`[sync-scheduler] Calling ${appUrl}/api/sync-job`)

    const response = await fetch(`${appUrl}/api/sync-job`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
      },
    })

    const data = await response.json()

    console.log(`[sync-scheduler] Response ${response.status}:`, JSON.stringify(data))

    return new Response(
      JSON.stringify({
        triggered_at: new Date().toISOString(),
        status: response.status,
        result: data,
      }),
      {
        status: response.ok ? 200 : 502,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sync-scheduler] Error:', message)

    return new Response(
      JSON.stringify({ error: message, triggered_at: new Date().toISOString() }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
