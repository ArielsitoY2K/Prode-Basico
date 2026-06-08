import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAllMatches, getGroups } from '@/lib/api/queries'
import { AppLayout } from '@/components/layout/AppLayout'
import { MatchCard } from '@/components/matches/MatchCard'
import { FixtureClient } from './FixtureClient'

export const revalidate = 1800 // 30 min

export default async function FixturePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [matches, groups] = await Promise.allSettled([
    getAllMatches(),
    getGroups(),
  ])

  const allMatches = matches.status === 'fulfilled' ? matches.value : []
  const allGroups = groups.status === 'fulfilled' ? groups.value : []

  return (
    <AppLayout>
      <FixtureClient matches={allMatches} groups={allGroups} />
    </AppLayout>
  )
}
