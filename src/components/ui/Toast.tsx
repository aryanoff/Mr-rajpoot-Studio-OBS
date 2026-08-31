import type { ReactNode } from "react";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastProps {
  id: string;
  variant?: ToastVariant;
  title: string;
  description?: string;
  icon?: ReactNode;
  onClose: (id: string) => void;
}

export default function Toast({
  id,
  variant = "info",
  title,
  description,
  icon,
  onClose,
}: ToastProps) {
  const variants = {
    success: "bg-status-success-bg border-status-success/20 text-status-success",
    error: "bg-status-error-bg border-status-error/20 text-status-error",
    warning: "bg-status-warning-bg border-status-warning/20 text-status-warning",
    info: "bg-surface-2 border-border text-text-primary",
  };

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-xl border p-4 shadow-popover flex gap-3 items-start",
        variants[variant]
      )}
    >
      <div className="shrink-0 mt-0.5">{icon || icons[variant]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{title}</h4>
        {description && (
          <p className="mt-1 text-xs opacity-90">{description}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}
