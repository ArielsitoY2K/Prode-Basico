-- ============================================================
-- Migration 004: Supabase pg_cron + pg_net scheduler
-- Reemplaza al Vercel Cron (limitado a 1x/día en plan free)
--
-- PASOS PREVIOS en Supabase Dashboard:
--   1. Database → Extensions → habilitar "pg_cron"
--   2. Database → Extensions → habilitar "pg_net"
--   3. Completar los INSERT de app_config al final de este archivo
--   4. Deploy la Edge Function: supabase functions deploy sync-scheduler
-- ============================================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Función helper para llamar al sync-job ────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_sync_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_app_url TEXT;
  v_secret  TEXT;
BEGIN
  SELECT value INTO v_app_url FROM app_config WHERE key = 'app_url';
  SELECT value INTO v_secret  FROM app_config WHERE key = 'cron_secret';

  IF v_app_url IS NULL OR v_secret IS NULL THEN
    RAISE WARNING '[sync] app_url o cron_secret no configurados en app_config';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_app_url || '/api/sync-job',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body    := '{}'::jsonb
  );

  RAISE LOG '[sync] sync-job disparado a %/api/sync-job', v_app_url;
END;
$$;

-- ── Programar ejecución cada 60 minutos (UTC) ─────────────────────────────────
-- Borra el job anterior si existe y lo recrea
SELECT cron.unschedule('sync-match-data') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-match-data'
);

SELECT cron.schedule(
  'sync-match-data',
  '0 * * * *',          -- en punto de cada hora (UTC)
  'SELECT trigger_sync_job()'
);

-- ── Configuración: completar estos valores ────────────────────────────────────
-- Ejecutar DESPUÉS de hacer el deploy en Vercel

INSERT INTO app_config (key, value, updated_at) VALUES
  ('app_url',     'https://prode-basico.vercel.app', NOW()),
  ('cron_secret', 'f51adaad353d63dc98beef4195cefba9',            NOW())
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = NOW();

-- ── Comandos útiles ───────────────────────────────────────────────────────────
-- Ver todos los jobs:           SELECT * FROM cron.job;
-- Ver historial:                SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- Ejecutar manualmente:         SELECT trigger_sync_job();
-- Pausar:                       SELECT cron.unschedule('sync-match-data');
-- Reactivar:                    SELECT cron.schedule('sync-match-data', '0 * * * *', 'SELECT trigger_sync_job()');
