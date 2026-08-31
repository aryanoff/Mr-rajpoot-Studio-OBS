/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: {
          DEFAULT: "var(--color-surface)",
          2: "var(--color-surface-2)",
          3: "var(--color-surface-3)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          hover: "var(--color-border-hover)",
          active: "var(--color-border-active)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "var(--color-accent-light)",
          dark: "var(--color-accent-dark)",
          cyan: "var(--color-accent-cyan)",
          "cyan-dark": "var(--color-accent-cyan-dark)",
        },
        status: {
          live: "var(--color-status-live)",
          "live-bg": "var(--color-status-live-bg)",
          success: "var(--color-status-success)",
          "success-bg": "var(--color-status-success-bg)",
          warning: "var(--color-status-warning)",
          "warning-bg": "var(--color-status-warning-bg)",
          error: "var(--color-status-error)",
          "error-bg": "var(--color-status-error-bg)",
          scheduled: "var(--color-status-scheduled)",
          "scheduled-bg": "var(--color-status-scheduled-bg)",
          offline: "var(--color-status-offline)",
          "offline-bg": "var(--color-status-offline-bg)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        // Semantic Typography Scale
        display: ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["2rem", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        h3: ["1.25rem", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" }],
        body: ["1rem", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.01em", fontWeight: "400" }],
        label: ["0.75rem", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        button: ["0.875rem", { lineHeight: "1.25", letterSpacing: "0.02em", fontWeight: "500" }],
        metric: ["2rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-accent": "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-light) 50%, var(--color-accent-cyan) 100%)",
        "gradient-surface": "linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-surface) 100%)",
        "gradient-glow": "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(124, 58, 237, 0.06), transparent 40%)",
        "hero-pattern": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 58, 237, 0.15), transparent)",
      },
      boxShadow: {
        // Elevation Scale
        flat: "none",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        raised: "var(--shadow-raised)",
        popover: "var(--shadow-popover)",
        modal: "var(--shadow-modal)",
        // Glows
        glow: "var(--shadow-glow)",
        "glow-lg": "var(--shadow-glow-lg)",
        "glow-cyan": "0 0 20px rgba(6, 182, 212, 0.15)",
      },
      transitionProperty: {
        height: 'height',
        spacing: 'margin, padding',
      },
      transitionDuration: {
        'hover': '200ms',
        'focus': '200ms',
        'dropdown': '150ms',
        'modal': '300ms',
        'toast': '300ms',
        'nav': '300ms',
      },
      transitionTimingFunction: {
        'hover': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'modal': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'dropdown': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-live": "pulseLive 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseLive: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        pill: "9999px",
      },
      spacing: {
        // Adding specific functional spacing if needed, but Tailwind's default is robust.
        // We will stick to the default spacing scale (p-4, gap-6, etc.) to ensure standard rem multiplication.
      }
    },
  },
  plugins: [],
};
