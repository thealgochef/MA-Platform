-- ============================================================
-- Migration 001: Core functions and triggers
-- ============================================================

-- Function: update_updated_at
-- Automatically sets updated_at to now() on row update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: handle_new_user
-- Creates a row in public.users when a new auth.users row is inserted
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function: log_deal_activity
-- Callable from API routes to insert into deal_activity_log
CREATE OR REPLACE FUNCTION log_deal_activity(
  p_deal_id uuid,
  p_actor_id uuid,
  p_action text,
  p_engagement_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO deal_activity_log (deal_id, engagement_id, actor_id, action, metadata)
  VALUES (p_deal_id, p_engagement_id, p_actor_id, p_action, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
