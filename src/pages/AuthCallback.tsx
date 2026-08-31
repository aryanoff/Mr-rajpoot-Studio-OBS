import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { getSupabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth.store";
import Button from "../components/ui/Button";

export default function AuthCallback() {
  const navigate = useNavigate();
  const initializeAuth = useAuthStore((state) => state.initialize);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      try {
        const supabase = getSupabase();
        
        // Supabase auto-handles the `#access_token=...` hash fragment in the URL
        // when getSession() is called, and sets the local session.
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          throw new Error("No session found in the URL callback");
        }

        // Re-initialize the auth store so it fetches the profile/role correctly
        await initializeAuth();
        
        if (mounted) {
          navigate("/dashboard", { replace: true });
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        if (mounted) {
          setError(err.message || "Failed to complete authentication");
        }
      }
    }

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [navigate, initializeAuth]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-surface-1 border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-status-error/10 text-status-error rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Authentication Failed</h2>
          <p className="text-sm text-text-secondary mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate("/login")}>
              Return to Login
            </Button>
            <Button variant="accent" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 size={48} className="text-accent animate-spin" />
        <div>
          <h2 className="text-xl font-bold text-text-primary">Completing sign-in...</h2>
          <p className="text-sm text-text-muted mt-1">Please wait while we securely log you in.</p>
        </div>
      </div>
    </div>
  );
}
