import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";
import { useProfile } from "../../features/auth/auth.hooks";
import { Radio } from "lucide-react";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuthStore();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const location = useLocation();

  if (status === "INITIALIZING" || (status === "AUTHENTICATED" && isProfileLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow mb-4 animate-pulse">
          <Radio size={24} className="text-white" />
        </div>
        <p className="text-text-muted">Checking permissions...</p>
      </div>
    );
  }

  if (status === "UNAUTHENTICATED") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile && profile.role !== "admin" && profile.role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
