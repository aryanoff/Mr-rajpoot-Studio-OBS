export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      billing_audit_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          created_at: string
          id: string
          provider: string
          provider_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider?: string
          provider_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider?: string
          provider_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      billing_plan_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string
          id: string
          metadata: Json
          plan_id: string
          reason: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          source: string
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by: string
          id?: string
          metadata?: Json
          plan_id: string
          reason?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source?: string
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string
          id?: string
          metadata?: Json
          plan_id?: string
          reason?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plan_grants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          advanced_analytics: boolean
          billing_interval: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          max_concurrent_streams: number | null
          max_destinations: number | null
          max_file_size_bytes: number | null
          max_fps: number | null
          max_playlists: number | null
          max_scenes: number | null
          max_schedules: number | null
          max_storage_bytes: number | null
          max_stream_resolution: string | null
          monthly_stream_seconds: number | null
          name: string
          price_amount: number
          updated_at: string
        }
        Insert: {
          advanced_analytics?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          id: string
          is_active?: boolean
          max_concurrent_streams?: number | null
          max_destinations?: number | null
          max_file_size_bytes?: number | null
          max_fps?: number | null
          max_playlists?: number | null
          max_scenes?: number | null
          max_schedules?: number | null
          max_storage_bytes?: number | null
          max_stream_resolution?: string | null
          monthly_stream_seconds?: number | null
          name: string
          price_amount?: number
          updated_at?: string
        }
        Update: {
          advanced_analytics?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_concurrent_streams?: number | null
          max_destinations?: number | null
          max_file_size_bytes?: number | null
          max_fps?: number | null
          max_playlists?: number | null
          max_scenes?: number | null
          max_schedules?: number | null
          max_storage_bytes?: number | null
          max_stream_resolution?: string | null
          monthly_stream_seconds?: number | null
          name?: string
          price_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      billing_reconciliation_runs: {
        Row: {
          completed_at: string | null
          details: Json
          discrepancies_found: number
          error: string | null
          id: string
          records_checked: number
          run_type: string
          started_at: string
          status: string
          target_user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          details?: Json
          discrepancies_found?: number
          error?: string | null
          id?: string
          records_checked?: number
          run_type?: string
          started_at?: string
          status?: string
          target_user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          details?: Json
          discrepancies_found?: number
          error?: string | null
          id?: string
          records_checked?: number
          run_type?: string
          started_at?: string
          status?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_reconciliation_runs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      billing_revenue_snapshots: {
        Row: {
          active_subscribers: number
          agency_subscribers: number
          canceled_count: number
          created_at: string
          creator_subscribers: number
          estimated_arr_cents: number
          id: string
          mrr_cents: number
          past_due_count: number
          pro_subscribers: number
          snapshot_date: string
        }
        Insert: {
          active_subscribers?: number
          agency_subscribers?: number
          canceled_count?: number
          created_at?: string
          creator_subscribers?: number
          estimated_arr_cents?: number
          id?: string
          mrr_cents?: number
          past_due_count?: number
          pro_subscribers?: number
          snapshot_date: string
        }
        Update: {
          active_subscribers?: number
          agency_subscribers?: number
          canceled_count?: number
          created_at?: string
          creator_subscribers?: number
          estimated_arr_cents?: number
          id?: string
          mrr_cents?: number
          past_due_count?: number
          pro_subscribers?: number
          snapshot_date?: string
        }
        Relationships: []
      }
      billing_usage_events: {
        Row: {
          amount: number
          created_at: string
          event_time: string
          event_type: string
          id: string
          idempotency_key: string
          metric: string
          resource_id: string | null
          resource_type: string
          usage_period_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          event_time?: string
          event_type: string
          id?: string
          idempotency_key: string
          metric: string
          resource_id?: string | null
          resource_type: string
          usage_period_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_time?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          metric?: string
          resource_id?: string | null
          resource_type?: string
          usage_period_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_events_usage_period_id_fkey"
            columns: ["usage_period_id"]
            isOneToOne: false
            referencedRelation: "billing_usage_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      billing_usage_periods: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_periods_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_usage_periods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      billing_webhook_events: {
        Row: {
          created_at: string
          event_created_at: string
          event_type: string
          id: string
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          provider: string
          provider_event_id: string
        }
        Insert: {
          created_at?: string
          event_created_at: string
          event_type: string
          id?: string
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider?: string
          provider_event_id: string
        }
        Update: {
          created_at?: string
          event_created_at?: string
          event_type?: string
          id?: string
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          aspect_ratio: string | null
          audio_codec: string | null
          bitrate: number | null
          cleanup_retry_count: number
          cleanup_worker_id: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deletion_status: Database["public"]["Enums"]["media_cleanup_status"]
          description: string | null
          duration_seconds: number | null
          file_path: string
          file_type: string
          filename: string
          fps: number | null
          height: number | null
          id: string
          mime_type: string | null
          next_cleanup_at: string | null
          processing_error: string | null
          processing_status:
            | Database["public"]["Enums"]["media_processing_status"]
            | null
          retention_eligible_at: string | null
          sample_rate: number | null
          size_bytes: number
          thumbnail_path: string | null
          title: string | null
          updated_at: string
          user_id: string
          video_codec: string | null
          width: number | null
        }
        Insert: {
          aspect_ratio?: string | null
          audio_codec?: string | null
          bitrate?: number | null
          cleanup_retry_count?: number
          cleanup_worker_id?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deletion_status?: Database["public"]["Enums"]["media_cleanup_status"]
          description?: string | null
          duration_seconds?: number | null
          file_path: string
          file_type: string
          filename: string
          fps?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          next_cleanup_at?: string | null
          processing_error?: string | null
          processing_status?:
            | Database["public"]["Enums"]["media_processing_status"]
            | null
          retention_eligible_at?: string | null
          sample_rate?: number | null
          size_bytes?: number
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          video_codec?: string | null
          width?: number | null
        }
        Update: {
          aspect_ratio?: string | null
          audio_codec?: string | null
          bitrate?: number | null
          cleanup_retry_count?: number
          cleanup_worker_id?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deletion_status?: Database["public"]["Enums"]["media_cleanup_status"]
          description?: string | null
          duration_seconds?: number | null
          file_path?: string
          file_type?: string
          filename?: string
          fps?: number | null
          height?: number | null
          id?: string
          mime_type?: string | null
          next_cleanup_at?: string | null
          processing_error?: string | null
          processing_status?:
            | Database["public"]["Enums"]["media_processing_status"]
            | null
          retention_eligible_at?: string | null
          sample_rate?: number | null
          size_bytes?: number
          thumbnail_path?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          video_codec?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      media_cleanup_logs: {
        Row: {
          attempted_at: string | null
          bytes_freed: number | null
          completed_at: string | null
          created_at: string
          eligible_at: string | null
          error: string | null
          id: string
          media_id: string | null
          policy: string | null
          reason: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          attempted_at?: string | null
          bytes_freed?: number | null
          completed_at?: string | null
          created_at?: string
          eligible_at?: string | null
          error?: string | null
          id?: string
          media_id?: string | null
          policy?: string | null
          reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_at?: string | null
          bytes_freed?: number | null
          completed_at?: string | null
          created_at?: string
          eligible_at?: string | null
          error?: string | null
          id?: string
          media_id?: string | null
          policy?: string | null
          reason?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          created_at: string
          duration_override: number | null
          enabled: boolean
          id: string
          media_id: string
          playlist_id: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_override?: number | null
          enabled?: boolean
          id?: string
          media_id: string
          playlist_id: string
          position: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_override?: number | null
          enabled?: boolean
          id?: string
          media_id?: string
          playlist_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          id: string
          name: string
          playback_mode: Database["public"]["Enums"]["playback_mode"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          playback_mode?: Database["public"]["Enums"]["playback_mode"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          playback_mode?: Database["public"]["Enums"]["playback_mode"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          last_login_at: string | null
          retention_enabled: boolean | null
          retention_keep_scheduled: boolean | null
          retention_unit: string | null
          retention_value: number | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          timezone: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          retention_enabled?: boolean | null
          retention_keep_scheduled?: boolean | null
          retention_unit?: string | null
          retention_value?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          timezone?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          retention_enabled?: boolean | null
          retention_keep_scheduled?: boolean | null
          retention_unit?: string | null
          retention_value?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          timezone?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      scene_sources: {
        Row: {
          config: Json
          created_at: string
          height: number
          id: string
          locked: boolean
          media_id: string | null
          name: string
          opacity: number
          rotation: number
          scene_id: string
          type: string
          updated_at: string
          visible: boolean
          width: number
          x: number
          y: number
          z_index: number
        }
        Insert: {
          config?: Json
          created_at?: string
          height?: number
          id?: string
          locked?: boolean
          media_id?: string | null
          name: string
          opacity?: number
          rotation?: number
          scene_id: string
          type: string
          updated_at?: string
          visible?: boolean
          width?: number
          x?: number
          y?: number
          z_index?: number
        }
        Update: {
          config?: Json
          created_at?: string
          height?: number
          id?: string
          locked?: boolean
          media_id?: string | null
          name?: string
          opacity?: number
          rotation?: number
          scene_id?: string
          type?: string
          updated_at?: string
          visible?: boolean
          width?: number
          x?: number
          y?: number
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "scene_sources_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_sources_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          background: string | null
          created_at: string
          fps: number
          height: number
          id: string
          name: string
          updated_at: string
          user_id: string
          version: number
          width: number
        }
        Insert: {
          background?: string | null
          created_at?: string
          fps?: number
          height?: number
          id?: string
          name: string
          updated_at?: string
          user_id: string
          version?: number
          width?: number
        }
        Update: {
          background?: string | null
          created_at?: string
          fps?: number
          height?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          version?: number
          width?: number
        }
        Relationships: []
      }
      schedule_runs: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          claimed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_id: string | null
          schedule_id: string
          scheduled_end: string | null
          scheduled_start: string
          status: Database["public"]["Enums"]["schedule_status"]
          stream_id: string | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          schedule_id: string
          scheduled_end?: string | null
          scheduled_start: string
          status?: Database["public"]["Enums"]["schedule_status"]
          stream_id?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string | null
          schedule_id?: string
          scheduled_end?: string | null
          scheduled_start?: string
          status?: Database["public"]["Enums"]["schedule_status"]
          stream_id?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_runs_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          cron_expression: string | null
          destination_id: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          is_recurring: boolean
          name: string
          playlist_id: string | null
          recurrence_config: Json | null
          recurrence_type: Database["public"]["Enums"]["schedule_recurrence_type"]
          start_time: string
          status: Database["public"]["Enums"]["schedule_status"]
          stream_id: string
          stream_mode: Database["public"]["Enums"]["playback_mode"]
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cron_expression?: string | null
          destination_id?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean
          name?: string
          playlist_id?: string | null
          recurrence_config?: Json | null
          recurrence_type?: Database["public"]["Enums"]["schedule_recurrence_type"]
          start_time: string
          status?: Database["public"]["Enums"]["schedule_status"]
          stream_id: string
          stream_mode?: Database["public"]["Enums"]["playback_mode"]
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cron_expression?: string | null
          destination_id?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean
          name?: string
          playlist_id?: string | null
          recurrence_config?: Json | null
          recurrence_type?: Database["public"]["Enums"]["schedule_recurrence_type"]
          start_time?: string
          status?: Database["public"]["Enums"]["schedule_status"]
          stream_id?: string
          stream_mode?: Database["public"]["Enums"]["playback_mode"]
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "stream_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_analytics: {
        Row: {
          avg_bitrate_kbps: number
          created_at: string
          dropped_frames_pct: number
          id: string
          stream_id: string
          updated_at: string
          uptime_seconds: number
          user_id: string
        }
        Insert: {
          avg_bitrate_kbps?: number
          created_at?: string
          dropped_frames_pct?: number
          id?: string
          stream_id: string
          updated_at?: string
          uptime_seconds?: number
          user_id: string
        }
        Update: {
          avg_bitrate_kbps?: number
          created_at?: string
          dropped_frames_pct?: number
          id?: string
          stream_id?: string
          updated_at?: string
          uptime_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_analytics_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: true
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stream_destinations: {
        Row: {
          created_at: string
          id: string
          label: string
          platform: Database["public"]["Enums"]["stream_platform"]
          secret_id: string
          stream_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          platform?: Database["public"]["Enums"]["stream_platform"]
          secret_id: string
          stream_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          platform?: Database["public"]["Enums"]["stream_platform"]
          secret_id?: string
          stream_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_destinations_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_sources: {
        Row: {
          id: string
          order_index: number
          stream_id: string
          type: Database["public"]["Enums"]["stream_source_type"]
          uri: string
          user_id: string
        }
        Insert: {
          id?: string
          order_index?: number
          stream_id: string
          type: Database["public"]["Enums"]["stream_source_type"]
          uri: string
          user_id: string
        }
        Update: {
          id?: string
          order_index?: number
          stream_id?: string
          type?: Database["public"]["Enums"]["stream_source_type"]
          uri?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_sources_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_status_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          status: string
          stream_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          status: string
          stream_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_status_logs_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          claimed_at: string | null
          created_at: string
          description: string | null
          fps: number
          id: string
          last_failure_at: string | null
          next_retry_at: string | null
          resolution: Database["public"]["Enums"]["stream_resolution"]
          retry_count: number
          scene_id: string | null
          scene_snapshot: Json | null
          status: Database["public"]["Enums"]["stream_status"]
          title: string
          updated_at: string
          user_id: string
          worker_id: string | null
          youtube_broadcast_id: string | null
          youtube_stream_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          description?: string | null
          fps?: number
          id?: string
          last_failure_at?: string | null
          next_retry_at?: string | null
          resolution?: Database["public"]["Enums"]["stream_resolution"]
          retry_count?: number
          scene_id?: string | null
          scene_snapshot?: Json | null
          status?: Database["public"]["Enums"]["stream_status"]
          title: string
          updated_at?: string
          user_id: string
          worker_id?: string | null
          youtube_broadcast_id?: string | null
          youtube_stream_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          description?: string | null
          fps?: number
          id?: string
          last_failure_at?: string | null
          next_retry_at?: string | null
          resolution?: Database["public"]["Enums"]["stream_resolution"]
          retry_count?: number
          scene_id?: string | null
          scene_snapshot?: Json | null
          status?: Database["public"]["Enums"]["stream_status"]
          title?: string
          updated_at?: string
          user_id?: string
          worker_id?: string | null
          youtube_broadcast_id?: string | null
          youtube_stream_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streams_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata_json: Json | null
          new_status: string
          previous_status: string | null
          provider_event_id: string | null
          subscription_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata_json?: Json | null
          new_status: string
          previous_status?: string | null
          provider_event_id?: string | null
          subscription_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata_json?: Json | null
          new_status?: string
          previous_status?: string | null
          provider_event_id?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          provider: string
          provider_subscription_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          plan_id: string
          provider?: string
          provider_subscription_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          provider?: string
          provider_subscription_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          created_at: string
          id: string
          storage_bytes: number
          stream_seconds: number
          updated_at: string
          usage_period_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          storage_bytes?: number
          stream_seconds?: number
          updated_at?: string
          usage_period_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          storage_bytes?: number
          stream_seconds?: number
          updated_at?: string
          usage_period_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_usage_period_id_fkey"
            columns: ["usage_period_id"]
            isOneToOne: false
            referencedRelation: "billing_usage_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      usage_reservations: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          resource_id: string | null
          resource_type: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          resource_id?: string | null
          resource_type: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          resource_id?: string | null
          resource_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_quotas: {
        Row: {
          active_streams: number
          created_at: string
          id: string
          max_concurrent_streams: number
          max_storage_mb: number
          updated_at: string
          used_storage_mb: number
          user_id: string
        }
        Insert: {
          active_streams?: number
          created_at?: string
          id?: string
          max_concurrent_streams?: number
          max_storage_mb?: number
          updated_at?: string
          used_storage_mb?: number
          user_id: string
        }
        Update: {
          active_streams?: number
          created_at?: string
          id?: string
          max_concurrent_streams?: number
          max_storage_mb?: number
          updated_at?: string
          used_storage_mb?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quotas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      worker_nodes: {
        Row: {
          active_streams: number
          created_at: string
          id: string
          last_heartbeat: string
          status: string
          updated_at: string
        }
        Insert: {
          active_streams?: number
          created_at?: string
          id: string
          last_heartbeat?: string
          status?: string
          updated_at?: string
        }
        Update: {
          active_streams?: number
          created_at?: string
          id?: string
          last_heartbeat?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_plan: {
        Args: {
          p_expires_at?: string
          p_plan_id: string
          p_reason?: string
          p_starts_at?: string
          p_user_id: string
        }
        Returns: string
      }
      admin_list_user_plan_grants: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          effective_plan_id: string
          effective_plan_name: string
          email: string
          entitlement_source: string
          full_name: string
          grant_created_at: string
          grant_expires_at: string
          grant_id: string
          grant_is_active: boolean
          grant_plan_id: string
          grant_reason: string
          grant_starts_at: string
          role: string
          stripe_plan_id: string
          stripe_status: string
          user_id: string
          username: string
        }[]
      }
      admin_revoke_plan_grant: {
        Args: { p_grant_id: string; p_reason?: string }
        Returns: boolean
      }
      backfill_usage_history: { Args: { p_user_id: string }; Returns: Json }
      claim_media_cleanup: {
        Args: { p_batch_size?: number; p_worker_id: string }
        Returns: {
          aspect_ratio: string | null
          audio_codec: string | null
          bitrate: number | null
          cleanup_retry_count: number
          cleanup_worker_id: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deletion_status: Database["public"]["Enums"]["media_cleanup_status"]
          description: string | null
          duration_seconds: number | null
          file_path: string
          file_type: string
          filename: string
          fps: number | null
          height: number | null
          id: string
          mime_type: string | null
          next_cleanup_at: string | null
          processing_error: string | null
          processing_status:
            | Database["public"]["Enums"]["media_processing_status"]
            | null
          retention_eligible_at: string | null
          sample_rate: number | null
          size_bytes: number
          thumbnail_path: string | null
          title: string | null
          updated_at: string
          user_id: string
          video_codec: string | null
          width: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "media_assets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_media_processing_job: {
        Args: { p_worker_id: string }
        Returns: {
          aspect_ratio: string | null
          audio_codec: string | null
          bitrate: number | null
          cleanup_retry_count: number
          cleanup_worker_id: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deletion_status: Database["public"]["Enums"]["media_cleanup_status"]
          description: string | null
          duration_seconds: number | null
          file_path: string
          file_type: string
          filename: string
          fps: number | null
          height: number | null
          id: string
          mime_type: string | null
          next_cleanup_at: string | null
          processing_error: string | null
          processing_status:
            | Database["public"]["Enums"]["media_processing_status"]
            | null
          retention_eligible_at: string | null
          sample_rate: number | null
          size_bytes: number
          thumbnail_path: string | null
          title: string | null
          updated_at: string
          user_id: string
          video_codec: string | null
          width: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "media_assets"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_queued_job: {
        Args: { p_worker_id: string }
        Returns: {
          claimed_at: string | null
          created_at: string
          description: string | null
          fps: number
          id: string
          last_failure_at: string | null
          next_retry_at: string | null
          resolution: Database["public"]["Enums"]["stream_resolution"]
          retry_count: number
          scene_id: string | null
          scene_snapshot: Json | null
          status: Database["public"]["Enums"]["stream_status"]
          title: string
          updated_at: string
          user_id: string
          worker_id: string | null
          youtube_broadcast_id: string | null
          youtube_stream_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "streams"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_schedule_run: {
        Args: { p_worker_id: string }
        Returns: {
          actual_end: string | null
          actual_start: string | null
          claimed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_id: string | null
          schedule_id: string
          scheduled_end: string | null
          scheduled_start: string
          status: Database["public"]["Enums"]["schedule_status"]
          stream_id: string | null
          updated_at: string
          worker_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "schedule_runs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      correct_usage_drift: {
        Args: {
          p_correct_value: number
          p_metric: string
          p_period_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: boolean
      }
      elevate_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      get_admin_billing_overview: {
        Args: never
        Returns: {
          active_subscribers: number
          cancellations_30d: number
          estimated_arr_cents: number
          failed_webhooks_count: number
          mrr_cents: number
          new_subscribers_30d: number
          past_due_count: number
          total_storage_bytes: number
          total_stream_seconds: number
          total_users: number
        }[]
      }
      get_admin_plan_distribution: {
        Args: never
        Returns: {
          mrr_cents: number
          plan_id: string
          plan_name: string
          price_amount: number
          subscriber_count: number
        }[]
      }
      get_admin_subscriptions_paged: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_plan_id?: string
          p_search?: string
          p_status?: string
        }
        Returns: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          full_name: string
          id: string
          masked_provider_sub_id: string
          plan_id: string
          plan_name: string
          price_amount: number
          provider: string
          status: string
          total_count: number
          user_id: string
          username: string
        }[]
      }
      get_admin_webhook_events: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string }
        Returns: {
          error_message: string
          event_type: string
          id: string
          processed_at: string
          processing_status: string
          provider: string
          provider_event_id: string
          received_at: string
          total_count: number
        }[]
      }
      get_current_usage_period: { Args: { p_user_id: string }; Returns: string }
      get_decrypted_secret: { Args: { p_secret_id: string }; Returns: string }
      get_effective_entitlements: {
        Args: { p_user_id: string }
        Returns: {
          advanced_analytics: boolean
          entitlement_source: string
          grant_expires_at: string
          grant_id: string
          grant_reason: string
          max_concurrent_streams: number
          max_destinations: number
          max_file_size_bytes: number
          max_fps: number
          max_playlists: number
          max_scenes: number
          max_schedules: number
          max_storage_bytes: number
          max_stream_resolution: string
          monthly_stream_seconds: number
          plan_id: string
          plan_name: string
        }[]
      }
      get_or_create_usage_period: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_usage_history: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          closed_at: string
          period_end: string
          period_id: string
          period_start: string
          plan_name: string
          status: string
          storage_bytes: number
          stream_seconds: number
          total_count: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      reap_stale_jobs: { Args: { timeout_minutes: number }; Returns: number }
      reconcile_user_usage: { Args: { p_user_id: string }; Returns: Json }
      record_stream_usage_event: {
        Args: {
          p_duration_seconds: number
          p_ended_at: string
          p_idempotency_key: string
          p_started_at: string
          p_stream_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      release_reservation: {
        Args: { p_reservation_id: string; p_status: string }
        Returns: boolean
      }
      reserve_storage: {
        Args: { p_bytes: number; p_resource_id: string; p_user_id: string }
        Returns: string
      }
      reserve_stream_slot: {
        Args: { p_stream_id: string; p_user_id: string }
        Returns: string
      }
      retry_admin_webhook_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      rollover_billing_periods: { Args: never; Returns: number }
      save_stream_destination: {
        Args: {
          p_destination_id?: string
          p_label: string
          p_platform?: Database["public"]["Enums"]["stream_platform"]
          p_stream_key: string
        }
        Returns: Json
      }
      store_stream_key: {
        Args: { description?: string; key_value: string; p_secret_id?: string }
        Returns: string
      }
      take_daily_revenue_snapshot: { Args: never; Returns: string }
    }
    Enums: {
      media_cleanup_status:
        | "active"
        | "retention_pending"
        | "delete_pending"
        | "deleted"
        | "delete_failed"
      media_processing_status: "queued" | "processing" | "ready" | "failed"
      playback_mode: "single" | "loop_current" | "loop_playlist"
      schedule_duration_mode: "unlimited" | "fixed_duration" | "end_at"
      schedule_recurrence_type:
        | "one_time"
        | "daily"
        | "weekly"
        | "selected_weekdays"
      schedule_status:
        | "draft"
        | "scheduled"
        | "running"
        | "completed"
        | "cancelled"
        | "missed"
        | "error"
      stream_platform: "youtube" | "twitch" | "custom"
      stream_resolution: "1080p" | "720p" | "480p"
      stream_source_type: "video_file" | "playlist" | "rtmp_pull" | "scene"
      stream_status:
        | "draft"
        | "queued"
        | "live"
        | "error"
        | "completed"
        | "stopping"
        | "reconnecting"
        | "cancelled"
      user_role: "user" | "moderator" | "admin" | "super_admin"
      user_status: "active" | "suspended" | "banned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      media_cleanup_status: [
        "active",
        "retention_pending",
        "delete_pending",
        "deleted",
        "delete_failed",
      ],
      media_processing_status: ["queued", "processing", "ready", "failed"],
      playback_mode: ["single", "loop_current", "loop_playlist"],
      schedule_duration_mode: ["unlimited", "fixed_duration", "end_at"],
      schedule_recurrence_type: [
        "one_time",
        "daily",
        "weekly",
        "selected_weekdays",
      ],
      schedule_status: [
        "draft",
        "scheduled",
        "running",
        "completed",
        "cancelled",
        "missed",
        "error",
      ],
      stream_platform: ["youtube", "twitch", "custom"],
      stream_resolution: ["1080p", "720p", "480p"],
      stream_source_type: ["video_file", "playlist", "rtmp_pull", "scene"],
      stream_status: [
        "draft",
        "queued",
        "live",
        "error",
        "completed",
        "stopping",
        "reconnecting",
        "cancelled",
      ],
      user_role: ["user", "moderator", "admin", "super_admin"],
      user_status: ["active", "suspended", "banned"],
    },
  },
} as const
