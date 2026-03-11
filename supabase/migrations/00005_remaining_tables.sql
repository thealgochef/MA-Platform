-- ============================================================
-- Migration 005: buyer_projects, messages, deal_activity_log, notification_preferences
-- ============================================================

-- Table: buyer_projects
CREATE TABLE buyer_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_firm_id uuid NOT NULL REFERENCES firms(id),
  name text NOT NULL,
  industry text,
  revenue_min numeric,
  revenue_max numeric,
  ebitda_min numeric,
  ebitda_max numeric,
  ebitda_margin numeric,
  location text,
  keywords text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER buyer_projects_updated_at
  BEFORE UPDATE ON buyer_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Table: messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES deal_engagements(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  content text,
  attachment_path text,
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: deal_activity_log
CREATE TABLE deal_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  engagement_id uuid REFERENCES deal_engagements(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: notification_preferences
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
