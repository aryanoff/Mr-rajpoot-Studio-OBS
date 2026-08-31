import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
}

export default function Skeleton({ className, variant = "rounded" }: SkeletonProps) {
  const variants = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-none",
    rounded: "rounded-xl",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-surface-3/50",
        variants[variant],
        className
      )}
      aria-hidden="true"
    />
  );
}
