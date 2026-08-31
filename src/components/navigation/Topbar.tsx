import { Bell, Menu, Search, User } from "lucide-react";
import { useUIStore } from "../../stores/ui.store";
import { useProfile } from "../../features/auth/auth.hooks";
import { NavLink } from "react-router-dom";
import ThemeToggle from "../ui/ThemeToggle";

interface TopbarProps {
  variant?: "app" | "admin";
}

export default function Topbar({ variant = "app" }: TopbarProps) {
  const { setSidebarMobileOpen } = useUIStore();
  const { data: profile } = useProfile();

  return (
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-xl sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        {/* Left: Mobile menu + Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-surface-2 text-text-secondary transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>

          <div title="Quick Search (⌘K)">
            <div className="hidden sm:flex items-center gap-2 bg-surface-2/50 rounded-xl px-3 py-2 border border-border w-64 lg:w-80 group cursor-not-allowed opacity-70">
              <Search size={16} className="text-text-muted shrink-0 transition-colors" />
              <input
                type="text"
                disabled
                placeholder="Search studio..."
                className="bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none w-full cursor-not-allowed"
              />
              <div className="shrink-0 flex items-center gap-1 bg-surface border border-border rounded px-1.5 py-0.5 text-[10px] font-mono text-text-muted shadow-sm">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Admin / App switch */}
          {profile?.role === "admin" || profile?.role === "super_admin" ? (
            <NavLink
              to={variant === "admin" ? "/dashboard" : "/admin"}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-text-secondary hover:text-text-primary border border-border hover:border-border-hover transition-all"
            >
              {variant === "admin" ? "User App" : "Admin Panel"}
            </NavLink>
          ) : null}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <div title="Notifications (No unread alerts)">
            <button disabled className="relative p-2 rounded-xl hover:bg-surface-2 text-text-secondary transition-colors cursor-not-allowed opacity-70">
              <Bell size={20} />
            </button>
          </div>

          {/* User */}
          <NavLink
            to="/settings"
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center overflow-hidden">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={16} className="text-white" />
              )}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-text-primary leading-tight">
                {profile?.fullName || "User"}
              </p>
              <p className="text-[10px] text-text-muted capitalize">
                {profile?.role || "user"}
              </p>
            </div>
          </NavLink>
        </div>
      </div>
    </header>
  );
}
