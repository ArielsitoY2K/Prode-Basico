'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { WSMatchUpdate, WSIncident } from '@/types'

interface UseWebSocketOptions {
  matchIds: number[]
  onMatchUpdate?: (update: WSMatchUpdate) => void
  onIncident?: (incident: WSIncident) => void
  enabled?: boolean
}

interface WSState {
  connected: boolean
  error: string | null
}

export function useMatchWebSocket({
  matchIds,
  onMatchUpdate,
  onIncident,
  enabled = true,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [state, setState] = useState<WSState>({ connected: false, error: null })
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!enabled || matchIds.length === 0) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    // API key is NOT sent to the browser - connection goes through a proxy endpoint
    // that the server sets up. In production, use a backend WebSocket proxy.
    const wsUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace('https', 'wss')}/api/ws?matches=${matchIds.join(',')}`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        if (!mountedRef.current) return
        setState({ connected: true, error: null })

        // Subscribe to each match
        matchIds.forEach(id => {
          ws.send(JSON.stringify({ action: 'subscribe', channel: `match:${id}` }))
          ws.send(JSON.stringify({ action: 'subscribe', channel: `match:${id}:incidents` }))
        })
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'match_update' || data.channel?.startsWith('match:')) {
            onMatchUpdate?.(data.payload || data)
          } else if (data.type === 'incident' || data.channel?.includes(':incidents')) {
            onIncident?.(data.payload || data)
          }
        } catch (e) {
          console.error('WS parse error:', e)
        }
      }

      ws.onclose = (event) => {
        if (!mountedRef.current) return
        setState(prev => ({ ...prev, connected: false }))

        // Reconnect if not a clean close
        if (event.code !== 1000 && enabled && matchIds.length > 0) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000)
        }
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setState({ connected: false, error: 'Error de conexión en vivo' })
      }

      wsRef.current = ws
    } catch (e) {
      setState({ connected: false, error: 'WebSocket no disponible' })
    }
  }, [enabled, matchIds, onMatchUpdate, onIncident])

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current)
    if (wsRef.current) {
      // Unsubscribe from channels before closing
      if (wsRef.current.readyState === WebSocket.OPEN) {
        matchIds.forEach(id => {
          wsRef.current?.send(JSON.stringify({ action: 'unsubscribe', channel: `match:${id}` }))
          wsRef.current?.send(JSON.stringify({ action: 'unsubscribe', channel: `match:${id}:incidents` }))
        })
      }
      wsRef.current.close(1000)
      wsRef.current = null
    }
  }, [matchIds])

  useEffect(() => {
    mountedRef.current = true
    if (enabled && matchIds.length > 0) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      mountedRef.current = false
      disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, JSON.stringify(matchIds)])

  return state
}
