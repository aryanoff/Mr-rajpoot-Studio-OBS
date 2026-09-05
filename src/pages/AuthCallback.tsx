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
        
        // Parse search params (?code=, ?error=, ?error_description=)
        const searchParams = new URLSearchParams(window.location.search);
        // Parse hash params (#access_token=, #error=, #error_description=)
        const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
        const hashParams = new URLSearchParams(rawHash);

        // 1. Check for OAuth error responses
        const errorParam = searchParams.get("error") || hashParams.get("error");
        const errorDesc = searchParams.get("error_description") || hashParams.get("error_description");
        if (errorParam || errorDesc) {
          throw new Error(errorDesc || errorParam || "Authentication failed from OAuth provider.");
        }

        // 2. PKCE flow: if authorization code is in query string, exchange it for session
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            throw exchangeErr;
          }
        }

        // 3. Verify session was established (via PKCE exchange or Supabase hash fragment auto-detection)
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          throw new Error("No active session could be established from the login callback.");
        }

        // 4. Re-initialize the auth store so profile/role/permissions are loaded
        await initializeAuth();
        
        // 5. Restore intended destination from sessionStorage
        let destination = "/dashboard";
        try {
          const savedTarget = sessionStorage.getItem("auth_redirect_target");
          if (savedTarget && savedTarget.startsWith("/") && !savedTarget.startsWith("//")) {
            destination = savedTarget;
            sessionStorage.removeItem("auth_redirect_target");
          }
        } catch {
          // ignore storage read errors
        }

        if (mounted) {
          navigate(destination, { replace: true });
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
