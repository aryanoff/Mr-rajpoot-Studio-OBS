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

  console.log(`Creating user ${email}...`);

  // 1. Create user in auth.users
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId = userData?.user?.id;

  if (createError) {
    if (createError.message.includes("already been registered")) {
      console.log("User already exists. Fetching user ID...");
      // Fetch the existing user to get their ID
      const { data: usersData, error: fetchError } = await supabase.auth.admin.listUsers();
      if (fetchError) {
        console.error("Failed to list users:", fetchError);
        process.exit(1);
      }
      const existingUser = usersData.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
      } else {
         console.error("Could not find user after collision.");
         process.exit(1);
      }
    } else {
      console.error("Error creating user:", createError);
      process.exit(1);
    }
  }

  if (!userId) {
    console.error("Failed to obtain User ID.");
    process.exit(1);
  }

  console.log(`User ID: ${userId}`);
  
  // Wait a moment for the profile trigger to run
  await new Promise(r => setTimeout(r, 1000));

  console.log("Elevating user to admin role...");

  // 2. Update profiles table to set role = 'admin'
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Error updating profile role:", updateError);
    process.exit(1);
  }

  console.log(`Successfully created admin user: ${email}`);
}

main().catch(console.error);
