// Diagnostic: Inspect Scene 2 and its sources in DB
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectScene() {
  console.log("=== SCENE & MEDIA SOURCE DIAGNOSTIC ===");
  
  // 1. Fetch Scene 2
  const { data: scenes, error: sErr } = await (supabase as any)
    .from("scenes")
    .select("*, scene_sources(*)")
    .order("updated_at", { ascending: false });

  if (sErr) {
    console.error("Scenes error:", sErr);
    return;
  }

  for (const scene of scenes || []) {
    console.log(`Scene: "${scene.name}" (ID: ${scene.id})`);
    console.log(`  Dimensions: ${scene.width}x${scene.height} @ ${scene.fps}fps`);
    console.log(`  Sources (${scene.scene_sources?.length || 0}):`);
    for (const src of scene.scene_sources || []) {
      console.log(`    Source: "${src.name}" (ID: ${src.id})`);
      console.log(`      type: ${src.type} | media_id: ${src.media_id}`);
      console.log(`      geometry: x=${src.x}, y=${src.y}, w=${src.width}, h=${src.height}, z=${src.z_index}, op=${src.opacity}, vis=${src.visible}`);
      console.log(`      config:`, JSON.stringify(src.config));

      // Fetch linked media asset
      if (src.media_id) {
        const { data: media } = await (supabase as any)
          .from("media_assets")
          .select("*")
          .eq("id", src.media_id)
          .single();
        if (media) {
          console.log(`      -> Media Asset: "${media.title || media.filename}" (status: ${media.processing_status})`);
          console.log(`         file_path: ${media.file_path}`);
          console.log(`         thumbnail_path: ${media.thumbnail_path}`);
          console.log(`         mime: ${media.mime_type || media.content_type} | type: ${media.file_type}`);

          // Test signed URL generation
          const { data: signData, error: signErr } = await supabase.storage
            .from("user_media")
            .createSignedUrl(media.file_path, 3600);
          
          if (signErr) {
            console.log(`         Signed URL generation: FAILED — ${signErr.message}`);
          } else {
            console.log(`         Signed URL generation: SUCCESS (length=${signData.signedUrl.length})`);
          }
        } else {
          console.log(`      -> Media Asset: NOT FOUND (media_id=${src.media_id})`);
        }
      }
    }
  }

  console.log("\n=== DIAGNOSTIC END ===");
  process.exit(0);
}

inspectScene().catch(console.error);
