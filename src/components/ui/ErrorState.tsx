import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export default function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again later.",
  actionLabel = "Retry",
  onAction,
  icon,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-status-error-bg/30 border border-status-error/20 rounded-2xl">
      <div className="w-16 h-16 bg-status-error-bg rounded-2xl flex items-center justify-center text-status-error mb-6 shadow-glow">
        {icon || <AlertTriangle size={32} />}
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="danger" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
