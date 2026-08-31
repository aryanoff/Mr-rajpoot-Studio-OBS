import { create } from "zustand";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";

export type AuthStatus = "INITIALIZING" | "AUTHENTICATED" | "UNAUTHENTICATED";

interface AuthState {
  user: SupabaseUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  initialize: () => void;
  setUser: (user: SupabaseUser | null) => void;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "INITIALIZING",
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setStatus: (status) => set({ status }),

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
          set({
            user: null,
            isAuthenticated: false,
            status: "UNAUTHENTICATED",
          });
        }
      });
    } catch (e) {
      console.error("Auth initialization failed:", e);
      set({
        user: null,
        isAuthenticated: false,
        status: "UNAUTHENTICATED", // Fails safely so public routes can render
      });
    }
  },
}));
