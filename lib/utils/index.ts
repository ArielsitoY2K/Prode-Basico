import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMatchDate(dateStr: string) {
  const date = new Date(dateStr)
  if (isToday(date)) return `HOY ${format(date, 'HH:mm')}`
  if (isTomorrow(date)) return `MÑN ${format(date, 'HH:mm')}`
  return format(date, "EEE d MMM", { locale: es }).toUpperCase()
}

export function formatMatchTime(dateStr: string) {
  return format(new Date(dateStr), 'HH:mm')
}

export function formatFullDate(dateStr: string) {
  return format(new Date(dateStr), "EEEE d 'de' MMMM", { locale: es })
}

export function timeUntilMatch(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff <= 0) return null

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes }
}

export function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    group: 'Fase de Grupos',
    round_of_32: 'Ronda de 32',
    round_of_16: 'Octavos de Final',
    quarter_final: 'Cuartos de Final',
    semi_final: 'Semifinal',
    third_place: 'Tercer Puesto',
    final: 'Final',
  }
  return labels[phase] || phase
}

export function getMatchResult(homeScore: number, awayScore: number): 'home' | 'away' | 'draw' {
  if (homeScore > awayScore) return 'home'
  if (homeScore < awayScore) return 'away'
  return 'draw'
}

export function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}
