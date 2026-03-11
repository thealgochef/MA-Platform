-- ============================================================
-- DEV-ONLY: Auto-approve new users during signup
-- ============================================================
-- ⚠️  REVERT TO 'pending' BEFORE PRODUCTION DEPLOYMENT ⚠️
--
-- This sets new users to 'approved' immediately so developers
-- can test the full platform flow without manual admin approval.
--
-- Production version must use 'pending' so admin vetting works.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'),
    'approved'  -- ⚠️ DEV-ONLY: change back to 'pending' for production
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
