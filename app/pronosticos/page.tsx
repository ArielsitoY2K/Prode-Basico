// app/pronosticos/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAllMatches, getGroups, getUserPredictions } from '@/lib/api/queries'
import { AppLayout } from '@/components/layout/AppLayout'
import { PronosticosClient } from './PronosticosClient'

// Seguridad absoluta: forzamos ejecución dinámica para que los pronósticos
// pertenezcan pura y exclusivamente al usuario que hace la petición.
export const dynamic = 'force-dynamic'

export default async function PronosticosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Si expiró el token o no está logueado, rebota de inmediato
  if (!user) {
    redirect('/auth/login')
  }

  // Traemos los partidos globales, la estructura de grupos y las apuestas del usuario en paralelo
  const [matches, groups, predictions] = await Promise.allSettled([
    getAllMatches(),
    getGroups(),
    getUserPredictions(user.id),
  ])

  // Armamos el mapeo para renderizado instantáneo en el cliente
  const predictionsMap: Record<string, { home_score: number; away_score: number; points_earned?: number | null }> = {}
  if (predictions.status === 'fulfilled') {
    for (const pred of predictions.value) {
      predictionsMap[pred.match_id] = {
        home_score: pred.home_score,
        away_score: pred.away_score,
        points_earned: pred.points_earned,
      }
    }
  }

  return (
    <AppLayout>
      <PronosticosClient
        matches={matches.status === 'fulfilled' ? matches.value : []}
        groups={groups.status === 'fulfilled' ? groups.value : []}
        predictionsMap={predictionsMap}
      />
    </AppLayout>
  )
}