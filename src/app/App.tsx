import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRouter from "./router";
import { useUIStore } from "../stores/ui.store";
import { useAuthStore } from "../stores/auth.store";
import { isSupabaseConfigured } from "../lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const initThemeListener = useUIStore((state) => state.initThemeListener);
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const unsubscribe = initThemeListener();
    return () => unsubscribe();
  }, [initThemeListener]);

  return (
    <QueryClientProvider client={queryClient}>
      {!isSupabaseConfigured && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-900/90 text-white p-4 rounded-xl border border-red-500/50 shadow-2xl max-w-sm backdrop-blur-md">
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Supabase Not Configured
          </h3>
          <p className="text-sm opacity-90 mb-3">
            Authentication and database features will fail.
          </p>
          <div className="bg-black/30 p-2 rounded text-xs font-mono">
            Copy .env.example to .env and set:
            <br />
            - VITE_SUPABASE_URL
            <br />
            - VITE_SUPABASE_ANON_KEY
          </div>
        </div>
      )}
      <AppRouter />
    </QueryClientProvider>
  );
}
