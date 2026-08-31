import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "live" | "scheduled" | "success" | "warning" | "error" | "offline" | "default";
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  pulse = false,
  className,
}: BadgeProps) {
  const variants = {
    live: "bg-status-live-bg text-status-live border-status-live/20",
    scheduled: "bg-status-scheduled-bg text-status-scheduled border-status-scheduled/20",
    success: "bg-status-success-bg text-status-success border-status-success/20",
    warning: "bg-status-warning-bg text-status-warning border-status-warning/20",
    error: "bg-status-error-bg text-status-error border-status-error/20",
    offline: "bg-status-offline-bg text-status-offline border-status-offline/20",
    default: "bg-surface-2 text-text-secondary border-border",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider rounded-full border",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {(variant === "live" || pulse) && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
