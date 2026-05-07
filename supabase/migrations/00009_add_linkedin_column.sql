-- Add linkedin column to users table (was missing from initial schema)
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin text;
