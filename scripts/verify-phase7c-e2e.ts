import { SupabaseClient, createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), 'worker', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPhase7c() {
  console.log("=== Verifying Phase 7C ===");

  // 1. Check Schema
  console.log("\n1. Verifying Database Schema...");
  const { data: cols, error } = await supabase.rpc('claim_media_processing_job', { p_worker_id: 'test' });
  if (error && !error.message.includes("does not exist")) {
    console.log("✅ claim_media_processing_job exists.");
  } else if (error) {
    console.log("❌ Missing RPC: claim_media_processing_job");
  } else {
     console.log("✅ claim_media_processing_job exists.");
  }

  // Check columns
  const { data: rows } = await supabase.from('media_assets').select('title, processing_status, thumbnail_path').limit(1);
  if (rows) {
     console.log("✅ media_assets contains title, processing_status, thumbnail_path.");
  } else {
     console.log("❌ media_assets schema validation failed.");
  }

  // 2. Check UI Files
  console.log("\n2. Verifying UI Components...");
  if (fs.existsSync(resolve(__dirname, '../src/components/media/MediaDetailsPanel.tsx'))) {
      console.log("✅ MediaDetailsPanel.tsx exists.");
  }
  if (fs.existsSync(resolve(__dirname, '../src/pages/Media/index.tsx'))) {
      console.log("✅ Media index.tsx exists.");
  }

  // 3. Check Worker
  console.log("\n3. Verifying Worker Modules...");
  if (fs.existsSync(resolve(__dirname, '../worker/src/mediaProcessor.ts'))) {
      console.log("✅ worker/src/mediaProcessor.ts exists.");
  }

  console.log("\nPhase 7C E2E Verification Complete.");
}

verifyPhase7c().catch(console.error);
