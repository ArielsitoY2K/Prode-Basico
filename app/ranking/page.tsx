import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLeaderboard } from '@/lib/api/queries'
import { AppLayout } from '@/components/layout/AppLayout'
import { RankingClient } from './RankingClient'

export const revalidate = 60

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

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
