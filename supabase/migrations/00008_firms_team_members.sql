-- ============================================================
-- Migration 008: Add team_members_requested to firms
-- ============================================================

ALTER TABLE firms ADD COLUMN team_members_requested text;
