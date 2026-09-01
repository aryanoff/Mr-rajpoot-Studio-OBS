import { create } from "zustand";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";
import { queryClient } from "../lib/queryClient";
import { useStudioStore } from "./studio.store";

export type AuthStatus = "INITIALIZING" | "AUTHENTICATED" | "UNAUTHENTICATED";

interface AuthState {
  user: SupabaseUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  initialize: () => void;
  setUser: (user: SupabaseUser | null) => void;
  setStatus: (status: AuthStatus) => void;
  logout: () => Promise<void>;
}

function clearUserState() {
  try {
    queryClient.clear();
    useStudioStore.getState().reset();
  } catch (err) {
    console.error("Error resetting user state on logout:", err);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "INITIALIZING",
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setStatus: (status) => set({ status }),

  logout: async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      clearUserState();
      set({
        user: null,
        isAuthenticated: false,
        status: "UNAUTHENTICATED",
      });
    }
  },

  initialize: () => {
    try {
      const supabase = getSupabase();

      // Check initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          set({
            user: session.user,
            isAuthenticated: true,
            status: "AUTHENTICATED",
          });
        } else {
          clearUserState();
          set({
            user: null,
            isAuthenticated: false,
            status: "UNAUTHENTICATED",
          });
        }
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          set({
            user: session.user,
            isAuthenticated: true,
            status: "AUTHENTICATED",
          });
        } else {
          clearUserState();
          set({
            user: null,
            isAuthenticated: false,
            status: "UNAUTHENTICATED",
          });
        }
      });
    } catch (e) {
      console.error("Auth initialization failed:", e);
      clearUserState();
      set({
        user: null,
        isAuthenticated: false,
        status: "UNAUTHENTICATED", // Fails safely so public routes can render
      });
    }
  },
}));
