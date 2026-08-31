import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  theme: ThemeMode;
  dismissedOnboarding: boolean;
  toggleSidebar: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setDismissedOnboarding: (val: boolean) => void;
  initThemeListener: () => () => void;
}

const applyThemeClass = (mode: "dark" | "light") => {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      theme: "light",
      dismissedOnboarding: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
      setDismissedOnboarding: (val) => set({ dismissedOnboarding: val }),
      setTheme: (theme) => {
        set({ theme });
        if (theme !== "system") {
          applyThemeClass(theme);
        } else {
          const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
          applyThemeClass(mediaQuery.matches ? "dark" : "light");
        }
      },
      initThemeListener: () => {
        const state = get();
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        // Initial application on mount
        if (state.theme === "system") {
          applyThemeClass(mediaQuery.matches ? "dark" : "light");
        } else {
          applyThemeClass(state.theme);
        }

        // Live listener for system changes
        const listener = (e: MediaQueryListEvent) => {
          if (get().theme === "system") {
            applyThemeClass(e.matches ? "dark" : "light");
          }
        };

        mediaQuery.addEventListener("change", listener);
        
        // Return unsubscribe function for cleanup
        return () => {
          mediaQuery.removeEventListener("change", listener);
        };
      },
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({ 
        theme: state.theme, 
        sidebarCollapsed: state.sidebarCollapsed,
        dismissedOnboarding: state.dismissedOnboarding
      }),
    }
  )
);
