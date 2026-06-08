-- ============================================================
-- PRODE MUNDIAL FIFA 2026 - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Teams ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  country TEXT NOT NULL,
  flag_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Groups ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  code CHAR(1) NOT NULL, -- A-L
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Team-Group relation ───────────────────────────────────────────────────────
ALTER TABLE teams ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

-- ── Group Standings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  points INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, team_id)
);

-- ── Matches ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id INTEGER UNIQUE NOT NULL,
  home_team_id UUID NOT NULL REFERENCES teams(id),
  away_team_id UUID NOT NULL REFERENCES teams(id),
  group_id UUID REFERENCES groups(id),
  phase TEXT NOT NULL DEFAULT 'group',
  round INTEGER DEFAULT 1,
  round_name TEXT NOT NULL DEFAULT '',
  match_date TIMESTAMPTZ NOT NULL,
  venue TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  home_score_ht INTEGER,
  away_score_ht INTEGER,
  minute INTEGER,
  winner_team_id UUID REFERENCES teams(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Match Events ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- goal, yellow_card, red_card, substitution, penalty, own_goal
  team_id UUID REFERENCES teams(id),
  player_name TEXT NOT NULL DEFAULT '',
  minute INTEGER NOT NULL,
  extra_minute INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  correct_results INTEGER DEFAULT 0,
  correct_winners INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Predictions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points_earned INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- ── Leaderboard ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  correct_results INTEGER DEFAULT 0,
  correct_winners INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  rank INTEGER DEFAULT 9999,
  previous_rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_matches_group ON matches(group_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(rank);
CREATE INDEX IF NOT EXISTS idx_group_standings_group ON group_standings(group_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Public read group_standings" ON group_standings FOR SELECT USING (true);
CREATE POLICY "Public read leaderboard" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Public read match_events" ON match_events FOR SELECT USING (true);

-- Profile policies
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service can insert profiles" ON profiles FOR INSERT WITH CHECK (true);

-- Prediction policies
CREATE POLICY "Users read own predictions" ON predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own predictions" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own predictions" ON predictions FOR UPDATE USING (auth.uid() = user_id);

-- ── Function: Recalculate points after match finishes ─────────────────────────
CREATE OR REPLACE FUNCTION calculate_match_predictions()
RETURNS TRIGGER AS $$
DECLARE
  pred RECORD;
  pts INTEGER;
  pred_winner TEXT;
  real_winner TEXT;
BEGIN
  -- Only when match status changes to finished
  IF NEW.status = 'finished' AND OLD.status != 'finished' 
     AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    
    FOR pred IN 
      SELECT * FROM predictions WHERE match_id = NEW.id AND points_earned IS NULL
    LOOP
      -- Calculate points
      IF pred.home_score = NEW.home_score AND pred.away_score = NEW.away_score THEN
        pts := 3; -- Exact result
      ELSE
        pred_winner := CASE 
          WHEN pred.home_score > pred.away_score THEN 'home'
          WHEN pred.home_score < pred.away_score THEN 'away'
          ELSE 'draw'
        END;
        real_winner := CASE
          WHEN NEW.home_score > NEW.away_score THEN 'home'
          WHEN NEW.home_score < NEW.away_score THEN 'away'
          ELSE 'draw'
        END;
        pts := CASE WHEN pred_winner = real_winner THEN 1 ELSE 0 END;
      END IF;

      -- Update prediction
      UPDATE predictions SET points_earned = pts WHERE id = pred.id;

      -- Update profile stats
      UPDATE profiles SET
        total_points = total_points + pts,
        correct_results = correct_results + (CASE WHEN pts = 3 THEN 1 ELSE 0 END),
        correct_winners = correct_winners + (CASE WHEN pts = 1 THEN 1 ELSE 0 END),
        updated_at = NOW()
      WHERE user_id = pred.user_id;

      -- Update leaderboard
      UPDATE leaderboard SET
        total_points = total_points + pts,
        correct_results = correct_results + (CASE WHEN pts = 3 THEN 1 ELSE 0 END),
        correct_winners = correct_winners + (CASE WHEN pts = 1 THEN 1 ELSE 0 END),
        updated_at = NOW()
      WHERE user_id = pred.user_id;
    END LOOP;

    -- Rerank leaderboard
    WITH ranked AS (
      SELECT id, RANK() OVER (ORDER BY total_points DESC, correct_results DESC) as new_rank
      FROM leaderboard
    )
    UPDATE leaderboard SET
      previous_rank = rank,
      rank = ranked.new_rank,
      updated_at = NOW()
    FROM ranked WHERE leaderboard.id = ranked.id;

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_match_finish ON matches;
CREATE TRIGGER on_match_finish
  AFTER UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION calculate_match_predictions();

-- ── Sync API key tracking ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type TEXT NOT NULL,
  requests_used INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (key, value) VALUES
  ('tournament_started', 'false'),
  ('tournament_finished', 'false'),
  ('initial_sync_done', 'false'),
  ('daily_requests_used', '0'),
  ('daily_requests_reset', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;
