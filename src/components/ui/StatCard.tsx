import { cn } from "../../lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "live" | "accent" | "success" | "warning";
  className?: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const iconBg = {
    default: "bg-surface-2 text-text-secondary",
    live: "bg-status-live-bg text-status-live",
    accent: "bg-accent/10 text-accent-light",
    success: "bg-status-success-bg text-status-success",
    warning: "bg-status-warning-bg text-status-warning",
  };

  return (
    <div
      className={cn(
        "glass-card glass-card-hover p-6 rounded-2xl",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary mb-1">{label}</p>
          <p className="text-3xl font-bold text-text-primary tracking-tight">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "text-xs mt-2 font-medium",
                trend.value >= 0 ? "text-status-success" : "text-status-error"
              )}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
              <span className="text-text-muted">{trend.label}</span>
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconBg[variant])}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
