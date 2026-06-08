# PRODE 2026 · Mundial FIFA

Aplicación de pronósticos para el Mundial FIFA 2026.

## Stack
- **Frontend:** Next.js 16 · React · TypeScript · TailwindCSS
- **Backend:** Next.js Server Actions · API Routes
- **DB:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (usuario + contraseña)
- **Tiempo real:** WebSocket + Supabase Realtime
- **Hosting:** Vercel
- **API:** SportsAPIPro V2

## Setup rápido

### 1. Variables de entorno
```bash
cp .env.local.example .env.local
# Completar con tus keys de Supabase y SportsAPIPro
```

### 2. Crear base de datos
En Supabase SQL Editor, ejecutar: `supabase/migrations/001_schema.sql`

### 3. Instalar y correr
```bash
npm install
npm run dev
```

### 4. Sync inicial (una sola vez, post-deploy)
```bash
curl -X POST "https://tu-app.vercel.app/api/sync?secret=TU_CRON_SECRET"
```
Importa 48 equipos, 12 grupos y 104 partidos desde SportsAPIPro.

## Deploy en Vercel
```bash
vercel deploy
```
El cron job (`vercel.json`) se ejecuta cada hora automáticamente.

## Consumo de API
| Tipo | Requests/día |
|------|-------------|
| Sync inicial | 3 (una sola vez) |
| Cron automático | ≤ 20 |
| WebSocket | 0 |

## Sistema de puntos
| Resultado | Puntos |
|-----------|--------|
| Resultado exacto | +3 |
| Ganador/empate correcto | +1 |
| Error | 0 |

Los puntos se calculan automáticamente via trigger PostgreSQL.
