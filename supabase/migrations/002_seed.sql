-- Migration 002: Ensure app_config has all required keys
-- Run after 001_schema.sql

INSERT INTO app_config (key, value) VALUES
  ('tournament_started', 'false'),
  ('tournament_finished', 'false'),
  ('initial_sync_done', 'false'),
  ('daily_requests_used', '0'),
  ('daily_requests_reset', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;

-- Create a view for leaderboard with profiles joined
CREATE OR REPLACE VIEW leaderboard_with_profiles AS
SELECT
  l.id,
  l.user_id,
  l.total_points,
  l.correct_results,
  l.correct_winners,
  l.total_predictions,
  l.rank,
  l.previous_rank,
  l.updated_at,
  p.username,
  p.first_name,
  p.last_name,
  p.avatar_url
FROM leaderboard l
LEFT JOIN profiles p ON p.user_id = l.user_id
ORDER BY l.rank;

-- Service role bypass RLS for sync operations
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role bypass" ON matches USING (true) WITH CHECK (true);

-- Allow service role to write everything
CREATE POLICY "Service write teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Service write groups" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Service write standings" ON group_standings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write events" ON match_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update matches" ON matches FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Service insert matches" ON matches FOR INSERT WITH CHECK (true);
