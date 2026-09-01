import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const email = process.argv[2] || "admin@gevon.tech";
const password = process.argv[3] || "GevonAdmin2026!";
const role = process.argv[4] || "super_admin";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Creating user: ${email}`);

  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError) {
    console.error("Failed to create user:", userError.message);
    process.exit(1);
  }

  console.log(`User created: ${user.user.id}`);

  const { error: adminError } = await supabase.from("platform_admins").insert({
    user_id: user.user.id,
    role,
    status: "active",
    created_by: user.user.id,
  });

  if (adminError) {
    console.error("Failed to grant admin:", adminError.message);
    process.exit(1);
  }

  console.log(`Platform admin granted: ${role}`);
  console.log("Done.");
}

main();
