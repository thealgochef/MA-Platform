-- ============================================================
-- Migration 012: Dedicated firm invitations
-- ============================================================

CREATE TABLE firm_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('broker', 'buyer')),
  invitation_token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

CREATE INDEX firm_invitations_email_idx ON firm_invitations (lower(email));
CREATE INDEX firm_invitations_firm_id_idx ON firm_invitations (firm_id);

ALTER TABLE firm_invitations ENABLE ROW LEVEL SECURITY;

-- Invitation tokens are bearer secrets. Do not add authenticated/anon SELECT
-- policies; service-role API routes and the SECURITY DEFINER RPC below are the
-- only intended access paths.
REVOKE ALL ON firm_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON firm_invitations TO service_role;

CREATE OR REPLACE FUNCTION accept_firm_invitation(
  p_invitation_token text,
  p_user_id uuid,
  p_user_email text,
  p_full_name text
)
RETURNS uuid AS $$
DECLARE
  v_invitation firm_invitations%ROWTYPE;
BEGIN
  IF p_invitation_token IS NULL OR trim(p_invitation_token) = '' THEN
    RAISE EXCEPTION 'Invitation token is required'
      USING ERRCODE = '22023';
  END IF;

  IF p_user_email IS NULL OR trim(p_user_email) = '' THEN
    RAISE EXCEPTION 'Authenticated user email is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_invitation
    FROM firm_invitations
   WHERE invitation_token = p_invitation_token
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_invitation.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already consumed'
      USING ERRCODE = '23505';
  END IF;

  IF lower(trim(v_invitation.email)) <> lower(trim(p_user_email)) THEN
    RAISE EXCEPTION 'Invitation email does not match authenticated user'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO users (
    id,
    email,
    full_name,
    firm_id,
    role,
    status,
    membership_agreement_signed
  ) VALUES (
    p_user_id,
    p_user_email,
    COALESCE(NULLIF(trim(p_full_name), ''), p_user_email),
    v_invitation.firm_id,
    v_invitation.role,
    'approved',
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(users.full_name, ''), EXCLUDED.full_name),
    firm_id = EXCLUDED.firm_id,
    role = EXCLUDED.role,
    status = 'approved';

  UPDATE firm_invitations
     SET consumed_at = now()
   WHERE id = v_invitation.id
     AND consumed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation already consumed'
      USING ERRCODE = '23505';
  END IF;

  RETURN v_invitation.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION accept_firm_invitation(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_firm_invitation(text, uuid, text, text) TO service_role;
