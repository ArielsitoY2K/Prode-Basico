// lib/api/sportsapi.ts
// NEVER import this from client components - server-side only

import { SportsAPIMatch, SportsAPIGroup, SportsAPITeam } from '@/types'

const BASE_URL = process.env.SPORTSAPI_BASE_URL || 'https://v2.football.sportsapipro.com'
const API_KEY = process.env.SPORTSAPI_KEY!

if (!API_KEY && typeof window === 'undefined') {
  console.warn('⚠️ SPORTSAPI_KEY not set')
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 }, // No cache for sync service
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`SportsAPI error ${response.status}: ${text}`)
  }

  return response.json()
}

// ── Initial sync (call once on deploy) ──────────────────────────────────────

export async function fetchAllTeams(): Promise<SportsAPITeam[]> {
  const data = await fetchAPI<{ teams: SportsAPITeam[] }>('/teams?tournament=fifa-world-cup-2026')
  return data.teams
}

export async function fetchAllGroups(): Promise<SportsAPIGroup[]> {
  const data = await fetchAPI<{ groups: SportsAPIGroup[] }>('/groups?tournament=fifa-world-cup-2026')
  return data.groups
}

export async function fetchAllMatches(): Promise<SportsAPIMatch[]> {
  const data = await fetchAPI<{ matches: SportsAPIMatch[] }>('/matches?tournament=fifa-world-cup-2026&limit=200')
  return data.matches
}

export async function fetchGroupStandings(): Promise<SportsAPIGroup[]> {
  const data = await fetchAPI<{ groups: SportsAPIGroup[] }>('/groups?tournament=fifa-world-cup-2026&include=standings')
  return data.groups
}

// ── Cron sync (≤20 requests/day) ─────────────────────────────────────────────

export async function fetchLiveAndRecentMatches(): Promise<SportsAPIMatch[]> {
  const data = await fetchAPI<{ matches: SportsAPIMatch[] }>('/matches?tournament=fifa-world-cup-2026&status=live,finished&limit=20')
  return data.matches
}

export async function fetchKnockoutMatches(): Promise<SportsAPIMatch[]> {
  const data = await fetchAPI<{ matches: SportsAPIMatch[] }>('/knockout?tournament=fifa-world-cup-2026')
  return data.matches
}

export async function fetchMatchById(apiId: number): Promise<SportsAPIMatch> {
  const data = await fetchAPI<{ match: SportsAPIMatch }>(`/matches/${apiId}`)
  return data.match
}
