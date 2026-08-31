import { Monitor, Moon, Sun } from "lucide-react";
import { useUIStore } from "../../stores/ui.store";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  const handleToggle = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const getIcon = () => {
    if (theme === "dark") return <Moon size={16} />;
    if (theme === "light") return <Sun size={16} />;
    return <Monitor size={16} />;
  };

  const getLabel = () => {
    if (theme === "dark") return "Dark Mode";
    if (theme === "light") return "Light Mode";
    return "System Mode";
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-xl hover:bg-surface-2 text-text-secondary transition-colors cursor-pointer flex items-center justify-center relative group"
      aria-label={`Toggle theme (Current: ${getLabel()})`}
      title={getLabel()}
    >
      {getIcon()}
      <span className="sr-only">{getLabel()}</span>
    </button>
  );
}

export function ThemeToggleSettingsVariant() {
  const { theme, setTheme } = useUIStore();
  
  const options = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Theme preference">
      {options.map((opt) => (
        <button
          key={opt.id}
          role="radio"
          aria-checked={theme === opt.id}
          onClick={() => setTheme(opt.id)}
          className={`relative px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
            theme === opt.id ? "text-white" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {theme === opt.id && (
            <motion.div
              layoutId="theme-active-pill"
              className="absolute inset-0 bg-accent rounded-lg shadow-glow"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <opt.icon size={16} className="relative z-10" />
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
