import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function seed() {
  console.log("Starting DB Seed for Stage 2...");

  // 1. Get a user ID (from auth.users)
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();

  if (authErr || !users || users.length === 0) {
    console.error("No users found in auth.users. Please sign up in the frontend first.", authErr);
    process.exit(1);
  }
  const userId = users[0].id;
  console.log(`Using user_id: ${userId}`);

  // 2. Store a mock stream key using RPC
  const { data: vaultId, error: vaultErr } = await supabase.rpc("store_stream_key", {
    key_value: "test-secret-123",
    description: "Integration Test Key",
  });

  if (vaultErr) {
    console.error("Failed to store stream key:", vaultErr);
    process.exit(1);
  }
  console.log(`Stored mock stream key in Vault with ID: ${vaultId}`);

  // 3. Delete existing stream with ID 999... if it exists to make script idempotent
  const streamId = "99999999-9999-9999-9999-999999999999";
  await supabase.from("streams").delete().eq("id", streamId);

  // 4. Insert Stream
  const { error: streamErr } = await supabase.from("streams").insert({
    id: streamId,
    user_id: userId,
    title: "Integration Test",
    status: "queued",
  });
  if (streamErr) throw streamErr;
  console.log("Inserted test stream.");

  // 5. Insert Source
  const { error: sourceErr } = await supabase.from("stream_sources").insert({
    user_id: userId,
    stream_id: streamId,
    type: "video_file",
    uri: "http://test.mp4",
  });
  if (sourceErr) throw sourceErr;
  console.log("Inserted test source.");

  // 6. Insert Destination
  const { error: destErr } = await supabase.from("stream_destinations").insert({
    user_id: userId,
    stream_id: streamId,
    platform: "youtube",
    secret_id: vaultId,
  });
  if (destErr) throw destErr;
  console.log("Inserted test destination.");

  console.log("Seed successful!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
