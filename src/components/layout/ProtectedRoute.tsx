import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";
import { Radio } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuthStore();
  const location = useLocation();

  if (status === "INITIALIZING") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow mb-4 animate-pulse">
          <Radio size={24} className="text-white" />
        </div>
        <p className="text-text-muted">Checking your session...</p>
      </div>
    );
  }

  if (status === "UNAUTHENTICATED") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
