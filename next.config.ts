import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Forzamos a Next.js a mapear internamente la raíz si el compilador automático falla ok
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/page', // Apuesta segura al archivo físico
      },
    ]
  },
}

export default nextConfig