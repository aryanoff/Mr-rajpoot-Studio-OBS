import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/auth.store";
import type { Profile } from "../../types";

export function useProfile() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      
      const supabase = getSupabase();
      const { data, error } = (await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()) as { data: any; error: any };
        
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return {
        id: data.id,
        userId: data.user_id,
        fullName: data.full_name,
        username: data.username,
        avatarUrl: data.avatar_url,
        role: data.role,
        status: data.status,
        timezone: data.timezone,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastLoginAt: data.last_login_at,
      } as Profile;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (updates: { fullName?: string; username?: string; timezone?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const payload: {
        full_name?: string;
        username?: string;
        timezone?: string;
        updated_at: string;
      } = {
        updated_at: new Date().toISOString(),
      };
      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.username !== undefined) payload.username = updates.username;
      if (updates.timezone !== undefined) payload.timezone = updates.timezone;

      const supabase = getSupabase();
      const { data, error } = await (supabase
        .from("profiles") as any)
        .update(payload)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}
