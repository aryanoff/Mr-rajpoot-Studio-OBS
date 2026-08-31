import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function downloadFile() {
  const { data, error } = await supabase.storage.from('user_media').download('27312c69-e901-4331-85c4-020267ad04fc/test-video.mp4');
  if (data) {
    const text = await data.text();
    console.log("File content:\n", text);
  }
}
downloadFile();
