# PRODE 2026 · Mundial FIFA

Aplicación de pronósticos para el Mundial FIFA 2026, construida con Next.js 16 y Supabase.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 · React · TypeScript · TailwindCSS |
| Auth | Supabase Auth (usuario + contraseña, sin email) |
| Base de datos | PostgreSQL via Supabase |
| Tiempo real | WebSocket proxy + Supabase Realtime |
| Scheduler | Supabase pg_cron + pg_net (reemplaza Vercel Cron) |
| API de datos | SportsAPIPro V2 |
| Hosting | Vercel (plan free compatible) |

## Arquitectura

```
SportsAPIPro API
      ↓ (≤20 requests/día)
  Next.js /api/sync-job
      ↑ (HTTP POST cada hora)
  pg_cron → pg_net → Supabase Edge Function
                          ↓
                      Supabase DB ←→ Supabase Realtime
                          ↓
                       Frontend
```

**Regla cardinal:** El frontend nunca consulta SportsAPIPro. La API key solo existe en Vercel env vars.

## Setup paso a paso

### 1. Clonar y configurar env vars

```bash
cp .env.local.example .env.local
# Completar con tus keys reales
```

### 2. Crear el proyecto Supabase

1. Ir a [supabase.com](https://supabase.com) → New project
2. En **Database → Extensions**, habilitar:
   - `pg_cron`
   - `pg_net`
3. En **SQL Editor**, ejecutar en orden:
   - `supabase/migrations/001_schema.sql` — tablas, RLS, trigger de puntos
   - `supabase/migrations/004_pg_cron.sql` — scheduler (después de tener la URL de Vercel)

### 3. Instalar dependencias

```bash
npm install
```

### 4. Deploy en Vercel

```bash
vercel deploy --prod
```

Configurar en Vercel Dashboard → Settings → Environment Variables todas las vars del `.env.local`.

### 5. Configurar Supabase Edge Function

```bash
# Instalar Supabase CLI si no lo tenés
npm install -g supabase

# Login
supabase login

# Vincular al proyecto
supabase link --project-ref TU_PROJECT_REF

# Deploy de la función (no requiere JWT propio, la llama pg_cron)
supabase functions deploy sync-scheduler --no-verify-jwt

# Configurar variables de entorno de la función
supabase secrets set APP_URL=https://tu-app.vercel.app
supabase secrets set CRON_SECRET=tu_cron_secret
```

### 6. Activar el scheduler en Supabase

Actualizar los valores en `004_pg_cron.sql` y ejecutar en SQL Editor:
```sql
UPDATE app_config SET value = 'https://tu-app.vercel.app' WHERE key = 'app_url';
UPDATE app_config SET value = 'tu_cron_secret' WHERE key = 'cron_secret';
```

Verificar que el job quedó programado:
```sql
SELECT * FROM cron.job;
```

### 7. Sync inicial de datos (una sola vez)

```bash
curl -X POST "https://tu-app.vercel.app/api/sync?secret=TU_CRON_SECRET"
```

Importa los 48 equipos, 12 grupos y 104 partidos. Tarda ~30 segundos.

---

## Consumo de API SportsAPIPro

| Acción | Requests |
|--------|----------|
| Sync inicial | 3 (una sola vez) |
| Cron cada hora | ≤ 2/ejecución |
| **Máximo diario** | **≤ 20** |
| WebSocket en vivo | 0 (no consume REST) |

El cron se omite automáticamente si:
- No hay partidos activos ni próximos en 3 horas
- Se alcanzaron las 20 requests del día
- El torneo finalizó (se auto-detecta)

---

## Sistema de puntos

| Resultado | Puntos |
|-----------|--------|
| Resultado exacto | +3 |
| Ganador / empate correcto | +1 |
| Error | 0 |

Los puntos se calculan via trigger de PostgreSQL automáticamente cuando un partido cambia a `finished`.

---

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing con próximos partidos |
| `/auth/login` | Inicio de sesión por usuario |
| `/auth/register` | Registro (nombre, apellido, usuario, contraseña) |
| `/dashboard` | Panel con stats, partidos en vivo y próximos |
| `/fixture` | 104 partidos con filtros por fase/grupo/fecha |
| `/grupos` | Tablas de posición Grupos A–L con partidos |
| `/pronosticos` | Carga de pronósticos con guardado batch |
| `/ranking` | Tabla de posiciones con actualización en tiempo real |

---

## API Endpoints

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/sync` | POST | `?secret=` | Sync inicial completo |
| `/api/sync-job` | POST | `Bearer token` | Sync horario (llamado por pg_cron) |
| `/api/webhook` | POST | `?secret=` | Eventos push de SportsAPIPro |
| `/api/ws` | WS | — | Proxy WebSocket (oculta API key) |
| `/api/match/[id]/events` | GET | Session | Eventos de un partido |
| `/api/user/profile` | GET | Session | Perfil del usuario autenticado |

---

## Estructura del proyecto

```
prode2026/
├── app/
│   ├── page.tsx                    # Landing
│   ├── auth/login/                 # Login
│   ├── auth/register/              # Registro
│   ├── dashboard/                  # Panel principal
│   ├── fixture/                    # Fixture completo
│   ├── grupos/                     # Tablas de grupos
│   ├── pronosticos/                # Cargar pronósticos
│   ├── ranking/                    # Posiciones
│   └── api/
│       ├── sync/                   # Sync inicial
│       ├── sync-job/               # Sync horario (pg_cron)
│       ├── webhook/                # Eventos en tiempo real
│       ├── ws/                     # Proxy WebSocket
│       ├── match/[id]/events/      # Eventos de un partido
│       └── user/profile/           # Perfil
├── components/
│   ├── layout/                     # Navbar, AppLayout, Providers
│   ├── matches/                    # MatchCard
│   ├── predictions/                # PredictionForm
│   └── live/                       # LiveMatch (WebSocket)
├── lib/
│   ├── api/                        # actions.ts, queries.ts, sportsapi.ts
│   ├── hooks/                      # useWebSocket.ts
│   ├── supabase/                   # client.ts, server.ts, middleware.ts
│   └── utils/                      # Formateo de fechas, labels
├── types/index.ts                  # Tipos TypeScript globales
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_schema.sql          # Schema + RLS + trigger
│   │   └── 004_pg_cron.sql         # Scheduler horario
│   └── functions/
│       └── sync-scheduler/         # Edge Function disparada por pg_cron
├── proxy.ts                        # Auth middleware (Next.js 16)
├── vercel.json                     # Function timeouts (sin cron de Vercel)
└── .env.local.example
```
