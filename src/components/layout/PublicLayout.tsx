import { Outlet, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Radio, Menu, X } from "lucide-react";
import { useState } from "react";
import Button from "../ui/Button";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
];

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="noise-overlay" />

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
                <Radio size={18} className="text-white" />
              </div>
              <div>
                <span className="font-bold text-sm text-text-primary">
                  MR RAJPOOT
                </span>
                <span className="block text-[10px] text-text-muted font-medium tracking-wider uppercase">
                  Studio
                </span>
              </div>
            </NavLink>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === "/"}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-accent-light bg-accent/10"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <NavLink to="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </NavLink>
              <NavLink to="/signup">
                <Button variant="accent" size="sm">
                  Get Started
                </Button>
              </NavLink>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-surface-2 text-text-secondary cursor-pointer"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden border-t border-border bg-surface/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === "/"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "text-accent-light bg-accent/10"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                <NavLink to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="md" className="w-full">
                    Log In
                  </Button>
                </NavLink>
                <NavLink to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="accent" size="md" className="w-full">
                    Get Started
                  </Button>
                </NavLink>
              </div>
            </div>
          </motion.div>
        )}
      </header>

      {/* Page content */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                  <Radio size={16} className="text-white" />
                </div>
                <span className="font-bold text-sm">MR RAJPOOT STUDIO</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                Cloud streaming platform. Stream to YouTube 24/7 without keeping
                your computer on.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">
                Product
              </h4>
              <ul className="space-y-2">
                {["Features", "Pricing", "Documentation", "Changelog"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-text-muted hover:text-text-primary transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">
                Company
              </h4>
              <ul className="space-y-2">
                {["About", "Blog", "Careers", "Contact"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">
                Legal
              </h4>
              <ul className="space-y-2">
                {["Privacy", "Terms", "Security"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-muted">
              © 2026 MR RAJPOOT STUDIO. All rights reserved.
            </p>
            <p className="text-xs text-text-muted">
              Built with ♥ for creators
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
