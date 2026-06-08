import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getGroups, getGroupStandings, getAllMatches } from '@/lib/api/queries'
import { AppLayout } from '@/components/layout/AppLayout'
import { GruposClient } from './GruposClient'

export const revalidate = 360 // 6 hours

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [groups, standings, matches] = await Promise.allSettled([
    getGroups(),
    getGroupStandings(),
    getAllMatches('group'),
  ])

  return (
    <AppLayout>
      <GruposClient
        groups={groups.status === 'fulfilled' ? groups.value : []}
        standings={standings.status === 'fulfilled' ? standings.value : []}
        matches={matches.status === 'fulfilled' ? matches.value : []}
      />
    </AppLayout>
  )
}
