import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// El nombre de la función DEBE ser "middleware" obligatoriamente para Next.js
export async function middleware(request: NextRequest) {
  // Supabase actualiza la sesión y retorna la respuesta interna con las cookies
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas de solicitud excepto las que empiezan por:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (icono de la pestaña)
     * - Imágenes con extensiones comunes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}