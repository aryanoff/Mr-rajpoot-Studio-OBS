import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: any;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning';
  disabled?: boolean;
}

interface AdminActionMenuProps {
  items: ActionMenuItem[];
  align?: 'left' | 'right';
}

export default function AdminActionMenu({ items, align = 'right' }: AdminActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        title="More actions"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1 w-44 bg-surface-1 border border-border rounded-xl shadow-popover py-1 z-30 animate-in fade-in zoom-in-95 duration-100`}
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isDanger = item.variant === 'danger';
            const isWarning = item.variant === 'warning';

            return (
              <button
                key={idx}
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDanger
                    ? 'text-status-error hover:bg-status-error/10'
                    : isWarning
                    ? 'text-status-warning hover:bg-status-warning/10'
                    : 'text-text-primary hover:bg-surface-2'
                }`}
              >
                {Icon && <Icon size={14} className="shrink-0" />}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
