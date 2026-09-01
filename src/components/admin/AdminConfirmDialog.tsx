import { AlertTriangle, AlertCircle, Info, ShieldAlert, X } from 'lucide-react';
import Button from '../ui/Button';

export interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  impactMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'warning' | 'danger' | 'critical' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function AdminConfirmDialog({
  isOpen,
  title,
  description,
  impactMessage,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  severity = 'warning',
  isLoading = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (severity) {
      case 'danger':
      case 'critical':
        return <ShieldAlert className="w-6 h-6 text-status-error shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-status-warning shrink-0" />;
      case 'info':
      default:
        return <Info className="w-6 h-6 text-accent shrink-0" />;
    }
  };

  const getConfirmVariant = () => {
    switch (severity) {
      case 'danger':
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'primary';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-1 border border-border rounded-2xl shadow-popover w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-surface-2 mt-0.5">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">{title}</h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">{description}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Impact Message Box */}
        {impactMessage && (
          <div className="p-3 bg-surface-2 rounded-xl border border-border/80 text-xs text-text-secondary flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
            <p className="leading-normal">{impactMessage}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="text-xs"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={getConfirmVariant() as any}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="text-xs font-semibold px-4"
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
