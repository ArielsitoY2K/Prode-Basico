'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Auth Actions ─────────────────────────────────────────────────────────────

export async function signUp(formData: {
  firstName: string
  lastName: string
  username: string
  password: string
}) {
  const supabase = await createClient()

  // Check username availability
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', formData.username)
    .single()

  if (existing) {
    return { error: 'El nombre de usuario ya está en uso' }
  }

  // Create auth user with a generated email from username
  const email = `${formData.username}@prode2026.app`

  const { data, error } = await supabase.auth.signUp({
    email,
    password: formData.password,
    options: {
      data: {
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: data.user.id,
      username: formData.username,
      first_name: formData.firstName,
      last_name: formData.lastName,
      total_points: 0,
      correct_results: 0,
      correct_winners: 0,
      total_predictions: 0,
    })

    if (profileError) {
      return { error: 'Error al crear el perfil' }
    }

    // Init leaderboard entry
    await supabase.from('leaderboard').insert({
      user_id: data.user.id,
      total_points: 0,
      correct_results: 0,
      correct_winners: 0,
      total_predictions: 0,
      rank: 9999,
    })
  }

  return { success: true }
}

export async function signIn(formData: { username: string; password: string }) {
  const supabase = await createClient()

  const email = `${formData.username}@prode2026.app`

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.password,
  })

  if (error) {
    return { error: 'Usuario o contraseña incorrectos' }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

// ── Prediction Actions ────────────────────────────────────────────────────────

export async function savePrediction(matchId: string, homeScore: number, awayScore: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Check match hasn't started
  const { data: match } = await supabase
    .from('matches')
    .select('match_date, status')
    .eq('id', matchId)
    .single()

  if (!match) return { error: 'Partido no encontrado' }

  const matchDate = new Date(match.match_date)
  if (matchDate <= new Date() || match.status !== 'scheduled') {
    return { error: 'Ya no se pueden cargar pronósticos para este partido' }
  }

  // Upsert prediction
  const { error } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,match_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/pronosticos')
  return { success: true }
}

export async function saveBatchPredictions(
  predictions: Array<{ matchId: string; homeScore: number; awayScore: number }>
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const now = new Date()

  // Validate all matches
  const matchIds = predictions.map(p => p.matchId)
  const { data: matches } = await supabase
    .from('matches')
    .select('id, match_date, status')
    .in('id', matchIds)

  const validPredictions = predictions.filter(p => {
    const match = matches?.find(m => m.id === p.matchId)
    if (!match) return false
    return new Date(match.match_date) > now && match.status === 'scheduled'
  })

  if (validPredictions.length === 0) {
    return { error: 'No hay pronósticos válidos para guardar' }
  }

  const { error } = await supabase
    .from('predictions')
    .upsert(
      validPredictions.map(p => ({
        user_id: user.id,
        match_id: p.matchId,
        home_score: p.homeScore,
        away_score: p.awayScore,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,match_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/pronosticos')
  return { success: true, saved: validPredictions.length }
}
