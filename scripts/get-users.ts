import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function main() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  console.log("Profiles count:", profiles?.length);
  console.log(JSON.stringify(profiles, null, 2));

  const { data: plans } = await supabase.from('billing_plans').select('*');
  console.log("Plans in DB:", JSON.stringify(plans, null, 2));
}

main().catch(console.error);
