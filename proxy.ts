import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CONTROL DE SEGURIDAD ABSOLUTO: 
  // Si el usuario está entrando a la raíz exactament, no tocamos la sesión
  // y dejamos que Next.js renderice el page.tsx directamente.
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Para cualquier otra ruta (dashboard, pronosticos, etc.), ejecutamos Supabase
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Intercepta todo excepto archivos estáticos e imágenes.
     * Al interceptar todo, Next.js no se marea con las rutas secundarias,
     * pero nuestro "if" de arriba protege la landing.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}