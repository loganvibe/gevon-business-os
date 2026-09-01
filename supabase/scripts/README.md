# Bootstrap First Platform Admin

This project uses `platform_admins` for Admin Portal (`/admin/*`) and Developer Portal (`/developers/*`) access. The first super_admin must be created manually because the in-app `grantPlatformAdmin` function requires an existing super_admin.

## Option A: Run the bootstrap script (requires service role key)

1. Get your **Service Role Key** from Supabase Dashboard → Project Settings → API → `service_role` key.
2. Add it to `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```
3. Run the script:
   ```bash
   node scripts/create-admin.js
   ```
   Or with custom email/password:
   ```bash
   node scripts/create-admin.js admin@gevon.tech MySecurePass123! super_admin
   ```

## Option B: SQL Editor (no service role key needed)

1. First create a user via the app (Sign up at `/auth`) or via Supabase Dashboard → Authentication → Users.
2. Copy that user's UUID.
3. Open Supabase Dashboard → SQL Editor and run:

```sql
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
```

4. Visit `/admin` — you should now have access.
