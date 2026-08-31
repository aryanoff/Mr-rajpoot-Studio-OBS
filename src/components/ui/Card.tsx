import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "glass" | "glow" | "bordered";
  hover?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
}

export default function Card({
  children,
  className,
  variant = "default",
  hover = false,
  padding = "md",
  ...props
}: CardProps) {
  const variants = {
    default: "bg-surface border border-border",
    glass: "glass-card",
    glow: "bg-surface border border-accent/20 shadow-glow",
    bordered: "bg-surface border border-border-hover",
  };

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-300",
        variants[variant],
        paddings[padding],
        hover && "glass-card-hover cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
