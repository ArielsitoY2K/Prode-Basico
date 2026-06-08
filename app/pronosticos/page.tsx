import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAllMatches, getGroups, getUserPredictions } from '@/lib/api/queries'
import { AppLayout } from '@/components/layout/AppLayout'
import { PronosticosClient } from './PronosticosClient'

export const revalidate = 60

export default async function PronosticosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [matches, groups, predictions] = await Promise.allSettled([
    getAllMatches(),
    getGroups(),
    getUserPredictions(user.id),
  ])

  // Build a map of matchId -> prediction for quick lookup
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
