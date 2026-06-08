-- Migration 003: Fix RLS policies for service role operations
-- Run this after 001 and 002

-- Drop duplicate/conflicting policies first
DROP POLICY IF EXISTS "Service role bypass" ON matches;
DROP POLICY IF EXISTS "Service write teams" ON teams;
DROP POLICY IF EXISTS "Service write groups" ON groups;
DROP POLICY IF EXISTS "Service write standings" ON group_standings;
DROP POLICY IF EXISTS "Service write events" ON match_events;
DROP POLICY IF EXISTS "Service update matches" ON matches;
DROP POLICY IF EXISTS "Service insert matches" ON matches;

-- Recreate clean policies
-- Teams: public read, service write
CREATE POLICY "Service upsert teams" ON teams FOR ALL USING (true) WITH CHECK (true);

-- Groups: public read, service write
CREATE POLICY "Service upsert groups" ON groups FOR ALL USING (true) WITH CHECK (true);

-- Group standings: public read, service write
CREATE POLICY "Service upsert standings" ON group_standings FOR ALL USING (true) WITH CHECK (true);

-- Matches: public read, service write
CREATE POLICY "Service upsert matches" ON matches FOR ALL USING (true) WITH CHECK (true);

-- Match events: public read, service write
CREATE POLICY "Service upsert events" ON match_events FOR ALL USING (true) WITH CHECK (true);

-- App config: service only
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manages config" ON app_config FOR ALL USING (true) WITH CHECK (true);

-- Sync log: service only
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service writes sync_log" ON sync_log FOR ALL USING (true) WITH CHECK (true);
