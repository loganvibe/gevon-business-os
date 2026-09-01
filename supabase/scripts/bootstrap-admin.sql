-- Bootstrap first platform admin directly in the database.
-- Usage:
--   1. Create a user first via the app (email/password or Google OAuth)
--      or via Supabase Dashboard > Authentication > Users.
--   2. Copy that user's UUID.
--   3. Paste it below and run this script in Supabase > SQL Editor.
--   4. Then visit /admin to access the Gevon Admin Portal.

DO $$
DECLARE
  v_user_id uuid := 'REPLACE_WITH_USER_UUID';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User % does not exist in auth.users', v_user_id;
  END IF;

  INSERT INTO public.platform_admins (user_id, role, status, created_by)
  VALUES (v_user_id, 'super_admin', 'active', v_user_id)
  ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', status = 'active', updated_at = now();

  RAISE NOTICE 'Platform super_admin granted to %', v_user_id;
END $$;
