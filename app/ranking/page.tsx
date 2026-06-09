// app/ranking/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLeaderboard } from '@/lib/api/queries'
import { AppLayout } from '@/components/layout/AppLayout'
import { RankingClient } from './RankingClient'

// Forzamos renderizado dinámico para evitar bloqueos en el build de Vercel
// y asegurar que las posiciones en la tabla se lean directo en tiempo real.
export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Si la sesión no es válida, rebota derecho al formulario de acceso
  if (!user) {
    redirect('/auth/login')
  }

  // Traemos el Top 100 del leaderboard y la posición específica de este usuario en paralelo
  const [leaderboard, userRankData] = await Promise.allSettled([
    getLeaderboard(100),
    supabase.from('leaderboard').select('rank, total_points').eq('user_id', user.id).single(),
  ])

  const entries = leaderboard.status === 'fulfilled' ? leaderboard.value : []
  const myRank = userRankData.status === 'fulfilled' ? userRankData.value.data : null

  return (
    <AppLayout>
      <RankingClient entries={entries} currentUserId={user.id} myRank={myRank} />
    </AppLayout>
  )
}