import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../../lib/supabase";
import type { Database } from "../../types/supabase";

type Schedule = Database["public"]["Tables"]["schedules"]["Row"];

export function useSchedules() {
  return useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("schedules").select("*").order("start_time", { ascending: true });
      if (error) throw error;
      return data as Schedule[];
    },
  });
}
