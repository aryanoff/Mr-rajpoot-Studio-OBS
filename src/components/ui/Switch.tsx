import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const switchId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex items-center justify-between gap-4">
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={switchId}
                className={cn(
                  "text-sm font-medium text-text-primary block",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn("text-xs text-text-muted mt-0.5", disabled && "opacity-50")}>
                {description}
              </p>
            )}
          </div>
        )}
        <label className={cn("relative inline-flex items-center", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
          <input
            type="checkbox"
            id={switchId}
            ref={ref}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div className={cn(
            "w-11 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer",
            "peer-checked:after:translate-x-full peer-checked:after:border-white",
            "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
            "after:bg-white after:border-border after:border after:rounded-full",
            "after:h-5 after:w-5 after:transition-all",
            "peer-checked:bg-accent",
            className
          )}></div>
        </label>
      </div>
    );
  }
);

Switch.displayName = "Switch";
export default Switch;
