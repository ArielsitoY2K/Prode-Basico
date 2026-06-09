// app/grupos/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getGroups, getGroupStandings, getAllMatches } from '@/lib/api/queries'
import { AppLayout } from '@/components/layout/AppLayout'
import { GruposClient } from './GruposClient'

// Forzamos comportamiento dinámico del servidor para chequear la cookie 
// y calcular la tabla de posiciones real al instante.
export const dynamic = 'force-dynamic'

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Rebote directo si no hay token de login
  if (!user) {
    redirect('/auth/login')
  }

  // Ejecutamos la triple consulta en paralelo para armar las tablas
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