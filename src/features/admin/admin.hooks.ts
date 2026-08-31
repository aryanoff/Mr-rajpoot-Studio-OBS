import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../../lib/supabase";
import type { Database } from "../../types/supabase";

type UserRole = Database["public"]["Enums"]["user_role"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useElevateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, newRole }: { targetUserId: string; newRole: UserRole }) => {
      const supabase = getSupabase() as any;
      const { error } = await supabase.rpc("elevate_user_role", {
        target_user_id: targetUserId,
        new_role: newRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });
}

export function useWorkers() {
  return useQuery({
    queryKey: ["admin_workers"],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("worker_nodes").select("*").order("last_heartbeat", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

