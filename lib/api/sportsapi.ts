// lib/api/sportsapi.ts
// SERVER-SIDE ONLY

import { SportsAPIMatch, SportsAPIGroup, SportsAPITeam } from '@/types'

const BASE_URL = process.env.SPORTSAPI_BASE_URL || 'https://v2.football.sportsapipro.com'
const API_KEY = process.env.SPORTSAPI_KEY!

if (!API_KEY && typeof window === 'undefined') {
  console.warn('⚠️ SPORTSAPI_KEY not set')
}

// Función de extracción inteligente copiada de tu otra app funcional
function autoExtractArray(obj: any): any[] | null {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) return obj;
  
  const commonKeys = ['matches', 'groups', 'data', 'results', 'response', 'items', 'standings'];
  for (const key of commonKeys) {
    if (obj[key] && Array.isArray(obj[key])) return obj[key];
    if (obj[key] && typeof obj[key] === 'object') {
      for (const subKey of commonKeys) {
        if (obj[key][subKey] && Array.isArray(obj[key][subKey])) return obj[key][subKey];
      }
    }
  }
  for (const key in obj) {
    if (Array.isArray(obj[key])) return obj[key];
    if (obj[key] && typeof obj[key] === 'object') {
      const deepFound = autoExtractArray(obj[key]);
      if (deepFound) return deepFound;
    }
  }
  return null;
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`
  const url = `${BASE_URL}${cleanEndpoint}`
  
  const response = await fetch(url, {
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`SportsAPI error ${response.status}: ${text}`)
  }

  return response.json()
}

// ── Sincronización Inicial con Inteligencia de Extracción ──

export async function fetchAllGroups(): Promise<SportsAPIGroup[]> {
  // Usamos los 12 grupos fijos que ya sabemos que funcionan impecable
  const letrasGrupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  return letrasGrupos.map((letra, index) => ({
    id: index + 1,
    name: `Grupo ${letra}`,
    code: letra,
    teams: []
  }));
}

export async function fetchAllTeams(): Promise<SportsAPITeam[]> {
  const response = await fetchAPI<any>('/world-cup-2026/teams')
  return autoExtractArray(response) || []
}

export async function fetchAllMatches(): Promise<SportsAPIMatch[]> {
  const allMatches: SportsAPIMatch[] = [];
  
  for (let page = 0; page <= 3; page++) {
    try {
      const response = await fetchAPI<any>(`/world-cup-2026/matches?page=${page}`);
      const cleanArray = autoExtractArray(response);
      
      if (cleanArray && cleanArray.length > 0) {
        const normalizedMatches = cleanArray.map((m: any) => {
          const homeNode = m.home_team || m.homeTeam || m.team_home || m.home;
          const awayNode = m.away_team || m.awayTeam || m.team_away || m.away;
          
          // CAPTURAMOS EL STATUS CON MÁXIMA SEGURIDAD
          let rawStatus = m.status;
          if (rawStatus && typeof rawStatus === 'object') {
            // Si la V2 manda un objeto tipo { name: "Scheduled", id: 1 }
            rawStatus = rawStatus.name || rawStatus.type || 'scheduled';
          }
          // Si no viene nada o viene un número, lo pasamos a string seguro
          const safeStatusStr = rawStatus ? String(rawStatus) : 'scheduled';

          return {
            ...m,
            id: m.id || m.match_id || m.gameId,
            home_team: {
              id: homeNode?.id || homeNode?.team_id || 0,
              name: homeNode?.name || homeNode?.team_name || 'Local'
            },
            away_team: {
              id: awayNode?.id || awayNode?.team_id || 0,
              name: awayNode?.name || awayNode?.team_name || 'Visitante'
            },
            date: m.date || m.datetime || m.timestamp || (m.startTimestamp ? new Date(m.startTimestamp * 1000).toISOString() : new Date().toISOString()),
            phase: m.phase || m.stage || 'group',
            
            // LE PASAMOS UN STRING SEGURO A TU ROUTE.TS
            status: safeStatusStr 
          };
        });

        allMatches.push(...normalizedMatches);
      } else {
        break;
      }
    } catch (e) {
      break;
    }
  }
  return allMatches;
}

export async function fetchGroupStandings(): Promise<SportsAPIGroup[]> {
  const response = await fetchAPI<any>('/world-cup-2026/groups')
  return autoExtractArray(response) || []
}

// ── Cron sync ─────────────────────────────────────────────────────────────

export async function fetchLiveAndRecentMatches(): Promise<SportsAPIMatch[]> {
  const response = await fetchAPI<any>('/live')
  const matches = autoExtractArray(response) || []
  return matches.filter((m: any) => m.tournament_id === 16 || m.tournament?.id === 16)
}

export async function fetchKnockoutMatches(): Promise<SportsAPIMatch[]> {
  const response = await fetchAPI<any>('/world-cup-2026/knockout')
  return autoExtractArray(response) || []
}

export async function fetchMatchById(apiId: number): Promise<SportsAPIMatch> {
  const response = await fetchAPI<any>(`/match/${apiId}`)
  return response.match || response.data || response
}