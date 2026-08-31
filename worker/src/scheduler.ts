import { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "./types/supabase";
import { workerId } from "./stateMachine";
import { spawnFfmpeg, isFfmpegRunning, terminateFfmpeg } from "./ffmpeg";
import { calculateNextRun, RecurrenceType } from "./utils/recurrence";

export async function pollScheduler(supabase: SupabaseClient<Database>) {
  const supabaseAny = supabase as any;
  const now = new Date();

  // 1. Process all active schedules (scheduled or running)
  const { data: schedules } = await supabaseAny
    .from("schedules")
    .select("*")
    .in("status", ["scheduled", "running"]);

  if (schedules) {
    for (const schedule of schedules) {
      // Find the latest scheduled run
      const { data: runs } = await supabaseAny
        .from("schedule_runs")
        .select("*")
        .eq("schedule_id", schedule.id)
        .order("scheduled_start", { ascending: false });

      // Clean up stale future runs (if schedule was edited)
      // Any run that is 'scheduled' (not yet running) and its scheduled_start is NOT the correct next run
      const futurePendingRuns = (runs || []).filter((r: any) => 
        r.status === 'scheduled' && new Date(r.scheduled_start).getTime() > now.getTime()
      );

      let referenceTime = new Date(); // Missed run policy: advance to next valid occurrence based on NOW

      // Wait, if it's a one_time schedule, referenceTime is its actual start_time to prevent skipping if we are slightly late
      if (schedule.recurrence_type === 'one_time') {
         referenceTime = new Date(schedule.start_time);
      } else {
         // If there is currently a RUNNING run, the next occurrence shouldn't overlap it.
         // Actually, missed policy says we base next occurrence on NOW.
      }

      const nextRunDate = calculateNextRun(
        schedule.start_time,
        schedule.timezone || 'UTC',
        schedule.recurrence_type as RecurrenceType,
        schedule.recurrence_config,
        schedule.end_time,
        referenceTime
      );

      if (nextRunDate) {
         const nextRunIso = nextRunDate.toISOString();
         
         // Delete any pending runs that don't match this exact nextRunIso
         const staleRuns = futurePendingRuns.filter((r: any) => r.scheduled_start !== nextRunIso);
         for (const stale of staleRuns) {
            await supabaseAny.from("schedule_runs").delete().eq("id", stale.id);
         }

         // Ensure the next run is populated if it's due
         if (nextRunDate.getTime() <= now.getTime()) {
             const existing = (runs || []).find((r: any) => r.scheduled_start === nextRunIso);
             if (!existing) {
                 const run = {
                   schedule_id: schedule.id,
                   scheduled_start: nextRunIso,
                   scheduled_end: schedule.duration_seconds 
                      ? new Date(nextRunDate.getTime() + schedule.duration_seconds * 1000).toISOString()
                      : schedule.end_time,
                   status: 'scheduled'
                 };
                 await supabaseAny.from("schedule_runs").insert(run);
             }
         } else {
             // It's in the future, we can insert it now so the UI sees it, but the worker won't claim it yet.
             const existing = (runs || []).find((r: any) => r.scheduled_start === nextRunIso);
             if (!existing) {
                 const run = {
                   schedule_id: schedule.id,
                   scheduled_start: nextRunIso,
                   scheduled_end: schedule.duration_seconds 
                      ? new Date(nextRunDate.getTime() + schedule.duration_seconds * 1000).toISOString()
                      : schedule.end_time,
                   status: 'scheduled'
                 };
                 await supabaseAny.from("schedule_runs").insert(run);
             }
         }
      } else {
         // No next run available. Mark as completed if not running.
         if (schedule.status !== 'running') {
            await supabaseAny.from("schedules").update({ status: 'completed' }).eq("id", schedule.id);
         }
      }
    }
  }

  // 2. Cancelled Schedules cleanup
  const { data: cancelledSchedules } = await supabaseAny
    .from("schedules")
    .select("id")
    .eq("status", "cancelled");
  
  if (cancelledSchedules && cancelledSchedules.length > 0) {
    // Delete any pending 'scheduled' runs for cancelled schedules
    for (const cs of cancelledSchedules) {
      await supabaseAny.from("schedule_runs").delete()
        .eq("schedule_id", cs.id)
        .eq("status", "scheduled");
    }
  }

  // 3. Claim pending schedule runs
  const { data: claimedRuns, error: claimError } = await supabaseAny
    .rpc("claim_schedule_run", { p_worker_id: workerId });

  if (claimError) {
    console.error("Error claiming schedule run:", claimError);
  } else if (claimedRuns && claimedRuns.length > 0) {
    for (const run of claimedRuns) {
      console.log(`Claimed schedule run: ${run.id}`);
      await executeScheduleRun(supabase, run);
    }
  }

  // 4. Check for fixed duration or end_time boundaries on running schedules
  const { data: runningRuns } = await supabaseAny
    .from("schedule_runs")
    .select("*, schedules(*)")
    .eq("status", "running")
    .eq("worker_id", workerId);

  if (runningRuns) {
    for (const run of runningRuns) {
      const schedule = run.schedules;
      let shouldStop = false;

      // Handle Cancelled Schedule: If the schedule was cancelled while running, the instructions state:
      // "current active run -> continues unless separately stopped"
      // So we DO NOT stop it here just because schedule.status is cancelled.
      
      // Stop condition 1: Fixed duration
      if (schedule.duration_seconds && run.actual_start) {
        const elapsed = (now.getTime() - new Date(run.actual_start).getTime()) / 1000;
        if (elapsed >= schedule.duration_seconds) {
          shouldStop = true;
          console.log(`Run ${run.id} reached fixed duration limit.`);
        }
      } 
      // Stop condition 2: end_time boundary
      else if (schedule.end_time) {
        if (now.getTime() >= new Date(schedule.end_time).getTime()) {
          shouldStop = true;
          console.log(`Run ${run.id} reached end_time boundary.`);
        }
      }

      if (shouldStop) {
        if (run.stream_id && isFfmpegRunning(run.stream_id)) {
          terminateFfmpeg(run.stream_id);
        }
        await supabaseAny.from("schedule_runs").update({ status: 'completed', actual_end: now.toISOString() }).eq("id", run.id);
        
        // Only mark schedule completed if it's one_time or no more runs. We'll let the next poll cycle handle schedule status.
        if (schedule.recurrence_type === 'one_time') {
           await supabaseAny.from("schedules").update({ status: 'completed' }).eq("id", schedule.id);
        } else {
           // For recurring, it goes back to 'scheduled' to wait for the next run
           if (schedule.status === 'running') {
              await supabaseAny.from("schedules").update({ status: 'scheduled' }).eq("id", schedule.id);
           }
        }

        if (run.stream_id) {
          // Just update status to stopping, pollJobs will handle FFmpeg kill and cleanup
          await supabaseAny.from("streams").update({ status: 'stopping' }).eq("id", run.stream_id);
        }
      }
    }
  }
}

async function executeScheduleRun(supabase: SupabaseClient<Database>, run: any) {
  const supabaseAny = supabase as any;
  const now = new Date().toISOString();

  // Mark run as running
  await supabaseAny.from("schedule_runs").update({
    status: 'running',
    actual_start: now
  }).eq("id", run.id);

  // Fetch the schedule
  const { data: schedule } = await supabaseAny.from("schedules").select("*").eq("id", run.schedule_id).single();
  if (!schedule) return;

  // Mark schedule as running
  await supabaseAny.from("schedules").update({ status: 'running' }).eq("id", schedule.id);

  let streamId = schedule.stream_id;
  if (!streamId) {
    const { data: newStream, error: streamErr } = await supabaseAny.from("streams").insert({
      user_id: schedule.user_id,
      title: schedule.name,
      status: 'queued',
      worker_id: null,
      claimed_at: null
    }).select().single();
    if (streamErr || !newStream) {
      await supabaseAny.from("schedule_runs").update({ status: 'error', error: streamErr?.message }).eq("id", run.id);
      return;
    }
    streamId = newStream.id;

    if (schedule.destination_id) {
      const { data: dest } = await supabaseAny.from("stream_destinations").select("*").eq("id", schedule.destination_id).single();
      if (dest) {
        await supabaseAny.from("stream_destinations").insert({
          user_id: schedule.user_id,
          stream_id: streamId,
          platform: dest.platform,
          secret_id: dest.secret_id
        });
      }
    }

    if (schedule.playlist_id) {
      const { data: items } = await supabaseAny.from("playlist_items").select("*, media_assets(*)").eq("playlist_id", schedule.playlist_id).eq("enabled", true).order("position", { ascending: true });
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          await supabaseAny.from("stream_sources").insert({
            user_id: schedule.user_id,
            stream_id: streamId,
            type: 'video_file',
            uri: items[i].media_assets.file_path,
            order_index: i
          });
        }
      }
    }

    await supabaseAny.from("schedule_runs").update({ stream_id: streamId }).eq("id", run.id);
  } else {
    // Stream exists
    await supabaseAny.from("streams").update({
      status: 'queued',
      worker_id: null,
      claimed_at: null
    }).eq("id", streamId);
  }
}
