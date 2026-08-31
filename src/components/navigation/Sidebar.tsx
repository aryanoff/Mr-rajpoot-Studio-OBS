import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Radio,
  Film,
  Calendar,
  FolderOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  ListMusic,
  CreditCard,
} from "lucide-react";
import { useUIStore } from "../../stores/ui.store";
import { cn } from "../../lib/utils";

interface SidebarProps {
  variant?: "app" | "admin";
}

type NavGroup = {
  title: string;
  items: { label: string; href: string; icon: any }[];
};

const appNavGroups: NavGroup[] = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Live Studio", href: "/studio", icon: Radio },
      { label: "Streams", href: "/streams", icon: Film },
    ],
  },
  {
    title: "CONTENT",
    items: [
      { label: "Media Library", href: "/media", icon: FolderOpen },
      { label: "Playlists", href: "/playlists", icon: ListMusic },
    ],
  },
  {
    title: "AUTOMATION",
    items: [
      { label: "Schedules", href: "/schedules", icon: Calendar },
    ],
  },
  {
    title: "INSIGHTS",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Billing & Plans", href: "/billing", icon: CreditCard },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    title: "ADMIN CONSOLE",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Billing & Revenue", href: "/admin/billing", icon: CreditCard },
      { label: "Users", href: "/admin/users", icon: LayoutDashboard },
      { label: "Streams", href: "/admin/streams", icon: Film },
      { label: "Workers", href: "/admin/workers", icon: Zap },
      { label: "Schedules", href: "/admin/schedules", icon: Calendar },
      { label: "Media", href: "/admin/media", icon: FolderOpen },
      { label: "System Logs", href: "/admin/logs", icon: BarChart3 },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ variant = "app" }: SidebarProps) {
  const { sidebarCollapsed, sidebarMobileOpen, toggleSidebar, setSidebarMobileOpen } =
    useUIStore();

  const navGroups = variant === "admin" ? adminNavGroups : appNavGroups;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border">
        <NavLink to={variant === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
            <Radio size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="font-bold text-sm text-text-primary">
                  MR RAJPOOT
                </span>
                <span className="block text-[10px] text-text-muted font-medium tracking-wider uppercase">
                  {variant === "admin" ? "Admin Console" : "Studio"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                {group.title}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/admin" || item.href === "/dashboard"}
                onClick={() => setSidebarMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-accent/10 text-accent-light border border-accent/20 shadow-[inset_4px_0_0_0_var(--color-accent)]"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent"
                  )
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon
                  size={20}
                  className="shrink-0 transition-colors"
                />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-border mt-auto flex flex-col gap-2">
        <button
          onClick={async () => {
            const { AuthService } = await import("../../features/auth/auth.service");
            await AuthService.signOut();
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-status-error hover:bg-status-error-bg hover:text-status-error transition-colors text-xs cursor-pointer font-medium"
          title={sidebarCollapsed ? "Log out" : undefined}
        >
          {sidebarCollapsed ? (
            <X size={16} /> 
          ) : (
            <>
              <X size={16} />
              <span>Log out</span>
            </>
          )}
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors text-xs cursor-pointer"
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden lg:block fixed left-0 top-0 h-screen bg-surface border-r border-border z-40"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-screen w-[280px] bg-surface border-r border-border z-50 lg:hidden"
            >
              <button
                onClick={() => setSidebarMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-2 text-text-muted cursor-pointer"
              >
                <X size={18} />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
