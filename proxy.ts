import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Quitamos la barra del filtro para probar si la landing carga sin pasar por Supabase
  matcher: [
    '/dashboard/:path*', 
    '/pronosticos/:path*', 
    '/fixture/:path*',
    '/ranking/:path*'
  ],
}