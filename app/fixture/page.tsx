// app/fixture/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAllMatches, getGroups } from '@/lib/api/queries'
import { AppLayout } from '@/components/layout/AppLayout'
import { FixtureClient } from './FixtureClient'

// Forzamos renderizado dinámico en servidor para evaluar la sesión 
// y traer el fixture actualizado al instante cuando haya goles.
export const dynamic = 'force-dynamic'

export default async function FixturePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Si no hay sesión válida en el navegador, rebota directo al login
  if (!user) {
    redirect('/auth/login')
  }

  // Traemos todos los partidos y los grupos en paralelo
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