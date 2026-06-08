-- ============================================================
-- PRODE MUNDIAL FIFA 2026 — Schema completo
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Teams ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id     INTEGER UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  short_name TEXT NOT NULL,
  country    TEXT NOT NULL,
  flag_url   TEXT DEFAULT '',
  group_id   UUID,                         -- FK se agrega más abajo
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Groups ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id     INTEGER UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  code       CHAR(1) NOT NULL,             -- A … L
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teams
  ADD CONSTRAINT teams_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id)
  ON DELETE SET NULL
  NOT VALID;

-- ── Group Standings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_standings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES teams(id)  ON DELETE CASCADE,
  played          INTEGER DEFAULT 0,
  won             INTEGER DEFAULT 0,
  drawn           INTEGER DEFAULT 0,
  lost            INTEGER DEFAULT 0,
  goals_for       INTEGER DEFAULT 0,
  goals_against   INTEGER DEFAULT 0,
  goal_difference INTEGER GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  points          INTEGER DEFAULT 0,
  position        INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, team_id)
);

-- ── Matches ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id          INTEGER UNIQUE NOT NULL,
  home_team_id    UUID NOT NULL REFERENCES teams(id),
  away_team_id    UUID NOT NULL REFERENCES teams(id),
  group_id        UUID REFERENCES groups(id),
  phase           TEXT NOT NULL DEFAULT 'group',
  round           INTEGER DEFAULT 1,
  round_name      TEXT NOT NULL DEFAULT '',
  match_date      TIMESTAMPTZ NOT NULL,
  venue           TEXT,
  city            TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  home_score      INTEGER,
  away_score      INTEGER,
  home_score_ht   INTEGER,
  away_score_ht   INTEGER,
  minute          INTEGER,
  winner_team_id  UUID REFERENCES teams(id),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Match Events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  team_id     UUID REFERENCES teams(id),
  player_name TEXT NOT NULL DEFAULT '',
  minute      INTEGER NOT NULL,
  extra_minute INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT UNIQUE NOT NULL,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  avatar_url          TEXT,
  total_points        INTEGER DEFAULT 0,
  correct_results     INTEGER DEFAULT 0,
  correct_winners     INTEGER DEFAULT 0,
  total_predictions   INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Predictions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id      UUID NOT NULL REFERENCES matches(id)    ON DELETE CASCADE,
  home_score    INTEGER NOT NULL,
  away_score    INTEGER NOT NULL,
  points_earned INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- ── Leaderboard ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points      INTEGER DEFAULT 0,
  correct_results   INTEGER DEFAULT 0,
  correct_winners   INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  rank              INTEGER DEFAULT 9999,
  previous_rank     INTEGER,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── App Config ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sync Log ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type       TEXT NOT NULL,
  requests_used   INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_status    ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date      ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_phase     ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_group     ON matches(group_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user  ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank  ON leaderboard(rank);
CREATE INDEX IF NOT EXISTS idx_standings_group   ON group_standings(group_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_standings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log         ENABLE ROW LEVEL SECURITY;

-- Lectura pública (datos del torneo)
CREATE POLICY "public_read_teams"       ON teams           FOR SELECT USING (true);
CREATE POLICY "public_read_groups"      ON groups          FOR SELECT USING (true);
CREATE POLICY "public_read_standings"   ON group_standings FOR SELECT USING (true);
CREATE POLICY "public_read_matches"     ON matches         FOR SELECT USING (true);
CREATE POLICY "public_read_events"      ON match_events    FOR SELECT USING (true);
CREATE POLICY "public_read_leaderboard" ON leaderboard     FOR SELECT USING (true);

-- Escritura total para service role (sync, cron, webhook)
CREATE POLICY "service_all_teams"       ON teams           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_groups"      ON groups          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_standings"   ON group_standings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_matches"     ON matches         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_events"      ON match_events    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_leaderboard" ON leaderboard     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_config"      ON app_config      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_sync_log"    ON sync_log        FOR ALL USING (true) WITH CHECK (true);

-- Perfiles
CREATE POLICY "own_profile_read"   ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_profile_update" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "service_profiles"   ON profiles FOR ALL   USING (true) WITH CHECK (true);

-- Pronósticos
CREATE POLICY "own_predictions_read"   ON predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_predictions_insert" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_predictions_update" ON predictions FOR UPDATE USING (auth.uid() = user_id);

-- ── Trigger: calcular puntos al finalizar un partido ──────────────────────────
CREATE OR REPLACE FUNCTION calculate_match_predictions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  pred         RECORD;
  pts          INTEGER;
  pred_winner  TEXT;
  real_winner  TEXT;
BEGIN
  IF NEW.status = 'finished'
     AND OLD.status != 'finished'
     AND NEW.home_score IS NOT NULL
     AND NEW.away_score IS NOT NULL
  THEN
    FOR pred IN
      SELECT * FROM predictions WHERE match_id = NEW.id AND points_earned IS NULL
    LOOP
      -- Resultado exacto → 3 pts
      IF pred.home_score = NEW.home_score AND pred.away_score = NEW.away_score THEN
        pts := 3;
      ELSE
        pred_winner := CASE
          WHEN pred.home_score > pred.away_score THEN 'home'
          WHEN pred.home_score < pred.away_score THEN 'away'
          ELSE 'draw' END;
        real_winner := CASE
          WHEN NEW.home_score > NEW.away_score THEN 'home'
          WHEN NEW.home_score < NEW.away_score THEN 'away'
          ELSE 'draw' END;
        pts := CASE WHEN pred_winner = real_winner THEN 1 ELSE 0 END;
      END IF;

      UPDATE predictions
        SET points_earned = pts, updated_at = NOW()
        WHERE id = pred.id;

      UPDATE profiles SET
        total_points      = total_points + pts,
        correct_results   = correct_results   + CASE WHEN pts = 3 THEN 1 ELSE 0 END,
        correct_winners   = correct_winners   + CASE WHEN pts = 1 THEN 1 ELSE 0 END,
        total_predictions = total_predictions + 1,
        updated_at        = NOW()
        WHERE user_id = pred.user_id;

      UPDATE leaderboard SET
        total_points      = total_points + pts,
        correct_results   = correct_results   + CASE WHEN pts = 3 THEN 1 ELSE 0 END,
        correct_winners   = correct_winners   + CASE WHEN pts = 1 THEN 1 ELSE 0 END,
        total_predictions = total_predictions + 1,
        updated_at        = NOW()
        WHERE user_id = pred.user_id;
    END LOOP;

    -- Recalcular ranking global
    WITH ranked AS (
      SELECT id, RANK() OVER (ORDER BY total_points DESC, correct_results DESC, correct_winners DESC) AS new_rank
      FROM leaderboard
    )
    UPDATE leaderboard lb SET
      previous_rank = lb.rank,
      rank          = r.new_rank,
      updated_at    = NOW()
    FROM ranked r WHERE lb.id = r.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_finish ON matches;
CREATE TRIGGER on_match_finish
  AFTER UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION calculate_match_predictions();

-- ── Datos iniciales de configuración ─────────────────────────────────────────
INSERT INTO app_config (key, value) VALUES
  ('tournament_started',  'false'),
  ('tournament_finished', 'false'),
  ('initial_sync_done',   'false'),
  ('daily_requests_used', '0'),
  ('daily_requests_reset', NOW()::TEXT),
  ('app_url',             'https://TU-APP.vercel.app'),
  ('cron_secret',         'TU_CRON_SECRET')
ON CONFLICT (key) DO NOTHING;
