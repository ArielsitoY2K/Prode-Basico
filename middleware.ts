// middleware.ts (Ubicado en la raíz de tu proyecto, al mismo nivel que /app)
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// CRITICAL: Next.js exige que la función se llame exactamente "middleware"
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. BYPASS ABSOLUTO PARA LA RAÍZ: Evita bucles en la landing
  if (pathname === '/') {
    return NextResponse.next()
  }

  // 2. BYPASS ABSOLUTO PARA APIS: Deja que los endpoints (/api/sync) 
  // manejen su propia seguridad interna con el CRON_SECRET
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 3. Para rutas protegidas de la app (dashboard, ranking, etc.), corre Supabase Auth
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Intercepta todo excepto archivos estáticos, imágenes y favicons.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}