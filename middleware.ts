// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Si entra a la raíz o a las APIs, pasa directo sin tocar nada
  if (pathname === '/' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 2. Para el resto de las páginas (dashboard, pronosticos, etc.)
  // Chequeamos de forma nativa si existe la cookie de sesión de Supabase.
  // Supabase suele guardar el token en una cookie que empieza con "sb-"
  const hasSessionCookie = request.cookies.getAll().some(cookie => cookie.name.startsWith('sb-'))

  if (!hasSessionCookie) {
    // Si no tiene la cookie de login, lo mandamos derecho a loguearse
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}