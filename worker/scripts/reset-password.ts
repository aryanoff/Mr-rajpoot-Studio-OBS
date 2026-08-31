import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = "raryansingh125@gmail.com";
  const password = "@Rajpoot0007";

  console.log(`Finding user ${email}...`);
  const { data: usersData, error: fetchError } = await supabase.auth.admin.listUsers();
  if (fetchError) {
    console.error("Failed to list users:", fetchError);
    process.exit(1);
  }
  const existingUser = usersData.users.find(u => u.email === email);

  if (!existingUser) {
    console.error("User not found!");
    process.exit(1);
  }

  console.log(`Updating password for ${existingUser.id}...`);
  const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password: password,
    email_confirm: true,
  });

  if (error) {
    console.error("Failed to update password:", error);
    process.exit(1);
  }

  console.log(`Successfully updated password for ${email}`);
}

main().catch(console.error);
