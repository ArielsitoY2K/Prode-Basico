// app/api/ws/route.ts
// Server-side WebSocket proxy - API key never reaches the browser
// Browsers connect to /api/ws, this forwards to SportsAPIPro WS

import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const matchesParam = searchParams.get('matches') || ''
  const matchIds = matchesParam.split(',').filter(Boolean)

  if (matchIds.length === 0) {
    return new Response('No match IDs provided', { status: 400 })
  }

  // Check for WebSocket upgrade
  const upgradeHeader = req.headers.get('upgrade')
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  const apiKey = process.env.SPORTSAPI_KEY
  if (!apiKey) {
    return new Response('API not configured', { status: 503 })
  }

  // In a production Edge runtime with WebSocket support (Cloudflare Workers / Vercel Edge),
  // you would use the WebSocket API directly. Vercel's current WebSocket support
  // via the Edge runtime uses the following pattern:

  // @ts-expect-error - Vercel Edge WebSocket API
  const { socket: clientSocket, response } = Deno?.upgradeWebSocket?.(req) || {}

  if (!clientSocket) {
    // Fallback: return 101 status for platforms that handle WS natively
    return new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      },
    })
  }

  const upstreamUrl = `${process.env.SPORTSAPI_WS_URL || 'wss://v2.football.sportsapipro.com/ws'}?x-api-key=${apiKey}`
  const upstream = new WebSocket(upstreamUrl)

  clientSocket.onopen = () => {
    // Subscribe only to visible matches
    matchIds.forEach(id => {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(JSON.stringify({ action: 'subscribe', channel: `match:${id}` }))
        upstream.send(JSON.stringify({ action: 'subscribe', channel: `match:${id}:incidents` }))
      }
    })
  }

  upstream.onmessage = (event) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(event.data)
    }
  }

  clientSocket.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data as string)
      if (msg.action === 'unsubscribe') {
        upstream.send(JSON.stringify(msg))
      }
    } catch {}
  }

  clientSocket.onclose = () => {
    upstream.close(1000)
  }

  upstream.onclose = () => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close(1000)
    }
  }

  upstream.onerror = () => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close(1011)
    }
  }

  return response
}
