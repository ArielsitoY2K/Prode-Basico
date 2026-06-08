// lib/api/queries.ts
// All data reads come from Supabase - never from SportsAPI directly

import { createClient } from '@/lib/supabase/server'
import { Match, Group, GroupStanding, LeaderboardEntry, Prediction, Team } from '@/types'

export async function getUpcomingMatches(limit = 10): Promise<Match[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      group:groups(*)
    `)
    .gte('match_date', now)
    .eq('status', 'scheduled')
    .order('match_date', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data as unknown as Match[]) || []
}

export async function getAllMatches(phase?: string): Promise<Match[]> {
  const supabase = await createClient()

  let query = supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      group:groups(*)
    `)
    .order('match_date', { ascending: true })

  if (phase) {
    query = query.eq('phase', phase)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as unknown as Match[]) || []
}

export async function getLiveMatches(): Promise<Match[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*),
      group:groups(*)
    `)
    .in('status', ['live', 'halftime'])
    .order('match_date', { ascending: true })

  if (error) throw error
  return (data as unknown as Match[]) || []
}

export async function getGroups(): Promise<Group[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('code', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getGroupStandings(groupId?: string): Promise<GroupStanding[]> {
  const supabase = await createClient()

  let query = supabase
    .from('group_standings')
    .select(`
      *,
      team:teams(*),
      group:groups(*)
    `)
    .order('position', { ascending: true })

  if (groupId) {
    query = query.eq('group_id', groupId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as unknown as GroupStanding[]) || []
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leaderboard')
    .select(`
      *,
      profile:profiles(*)
    `)
    .order('rank', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data as unknown as LeaderboardEntry[]) || []
}

export async function getUserPredictions(userId: string): Promise<Prediction[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('predictions')
    .select(`
      *,
      match:matches(
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*),
        group:groups(*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as unknown as Prediction[]) || []
}

export async function getUserPredictionForMatch(userId: string, matchId: string): Promise<Prediction | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as Prediction | null
}

export async function getTeams(): Promise<Team[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function getUserRank(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leaderboard')
    .select('rank, total_points')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}
