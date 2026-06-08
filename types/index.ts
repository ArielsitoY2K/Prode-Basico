// types/index.ts

export interface Profile {
  id: string
  user_id: string
  username: string
  first_name: string
  last_name: string
  avatar_url?: string
  total_points: number
  correct_results: number
  correct_winners: number
  total_predictions: number
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  api_id: number
  name: string
  short_name: string
  country: string
  flag_url: string
  group_id?: string
  created_at: string
}

export interface Group {
  id: string
  api_id: number
  name: string
  code: string // A, B, C... L
  created_at: string
}

export interface GroupStanding {
  id: string
  group_id: string
  team_id: string
  team?: Team
  group?: Group
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  position: number
  updated_at: string
}

export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed' | 'cancelled'
export type MatchPhase = 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final'

export interface Match {
  id: string
  api_id: number
  home_team_id: string
  away_team_id: string
  home_team?: Team
  away_team?: Team
  group_id?: string
  group?: Group
  phase: MatchPhase
  round: number
  round_name: string
  match_date: string
  venue?: string
  city?: string
  status: MatchStatus
  home_score?: number
  away_score?: number
  home_score_ht?: number
  away_score_ht?: number
  minute?: number
  winner_team_id?: string
  updated_at: string
}

export interface MatchEvent {
  id: string
  match_id: string
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty' | 'own_goal'
  team_id: string
  player_name: string
  minute: number
  extra_minute?: number
  created_at: string
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  match?: Match
  home_score: number
  away_score: number
  points_earned?: number
  created_at: string
  updated_at: string
}

export interface LeaderboardEntry {
  id: string
  user_id: string
  profile?: Profile
  total_points: number
  correct_results: number
  correct_winners: number
  total_predictions: number
  rank: number
  previous_rank?: number
  updated_at: string
}

// API Response types
export interface SportsAPITeam {
  id: number
  name: string
  short_name: string
  country: string
  logo: string
}

export interface SportsAPIGroup {
  id: number
  name: string
  teams: SportsAPITeam[]
  standings?: SportsAPIStanding[]
}

export interface SportsAPIStanding {
  team: SportsAPITeam
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  points: number
  position: number
}

export interface SportsAPIMatch {
  id: number
  home_team: SportsAPITeam
  away_team: SportsAPITeam
  group?: { id: number; name: string }
  phase: string
  round: number
  round_name: string
  date: string
  venue?: string
  city?: string
  status: string
  home_score?: number
  away_score?: number
  home_score_ht?: number
  away_score_ht?: number
  minute?: number
}

export interface SportsAPIEvent {
  type: string
  team: SportsAPITeam
  player: string
  minute: number
  extra_minute?: number
}

// WebSocket message types
export interface WSMatchUpdate {
  match_id: number
  status: string
  home_score: number
  away_score: number
  minute: number
  events?: SportsAPIEvent[]
}

export interface WSIncident {
  match_id: number
  type: string
  team: SportsAPITeam
  player: string
  minute: number
}

// Scoring
export const POINTS = {
  EXACT_RESULT: 3,
  CORRECT_WINNER: 1,
  WRONG: 0,
} as const

export function calculatePoints(
  prediction: { home_score: number; away_score: number },
  result: { home_score: number; away_score: number }
): number {
  if (prediction.home_score === result.home_score && prediction.away_score === result.away_score) {
    return POINTS.EXACT_RESULT
  }
  const predWinner = prediction.home_score > prediction.away_score ? 'home'
    : prediction.home_score < prediction.away_score ? 'away' : 'draw'
  const resWinner = result.home_score > result.away_score ? 'home'
    : result.home_score < result.away_score ? 'away' : 'draw'
  if (predWinner === resWinner) return POINTS.CORRECT_WINNER
  return POINTS.WRONG
}
