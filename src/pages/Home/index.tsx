import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import {
  Radio,
  Cloud,
  Calendar,
  RefreshCw,
  Monitor,
  Shield,
  BarChart3,
  Image,
  Zap,
  ArrowRight,
  Check,
  Play
} from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const features = [
  {
    icon: Cloud,
    title: "24/7 Cloud Streaming",
    description:
      "Upload your video, schedule it, and stream to YouTube around the clock. Your PC can be completely off."
  },
  {
    icon: Radio,
    title: "YouTube Live Publishing",
    description:
      "Publish directly to YouTube Live. Connect your stream key and broadcast in seconds."
  },
  {
    icon: Calendar,
    title: "Live Scheduler",
    description:
      "Set start and end dates, times, and timezones. Schedule recurring streams daily, weekly, or custom."
  },
  {
    icon: RefreshCw,
    title: "Automatic Recovery",
    description:
      "If a connection drops, the cloud streaming engine detects it and restarts the broadcast automatically."
  },
  {
    icon: Monitor,
    title: "Multiple Formats",
    description:
      "Landscape 16:9, Vertical 9:16, Square 1:1. From 720p to 1080p 60fps."
  },
  {
    icon: Image,
    title: "Media Playlists",
    description:
      "Build playlists from videos, images, and music. Loop, shuffle, or play sequentially."
  },
  {
    icon: BarChart3,
    title: "Stream Analytics",
    description:
      "Monitor bitrate, uptime, viewer health, and stream quality in real-time."
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Stream keys are encrypted server-side with AES-256. Row-level security ensures your data is protected."
  }
];

const steps = [
  {
    step: "01",
    title: "Upload Your Media",
    description:
      "Upload videos, background music, or logos. Files are stored securely in the cloud."
  },
  {
    step: "02",
    title: "Design in Studio",
    description:
      "Position your video on the canvas, add your title, and connect your YouTube stream key."
  },
  {
    step: "03",
    title: "Go Live from the Cloud",
    description:
      "The cloud streaming engine handles everything. Close your browser — the stream continues 24/7."
  }
];

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "/forever",
    description: "Perfect for getting started",
    features: [
      "1 concurrent stream",
      "720p max resolution",
      "5 GB media storage",
      "Basic scheduling",
      "Community support"
    ],
    cta: "Start Free",
    highlighted: false
  },
  {
    name: "Pro",
    price: "₹499",
    period: "/month",
    description: "For serious creators",
    features: [
      "3 concurrent streams",
      "1080p max resolution",
      "50 GB media storage",
      "Advanced scheduling",
      "Priority support",
      "Stream analytics",
      "Custom thumbnails"
    ],
    cta: "Start Pro Trial",
    highlighted: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams & agencies",
    features: [
      "Unlimited streams",
      "4K resolution",
      "Unlimited storage",
      "Multi-user access",
      "Dedicated streaming engines",
      "SLA guarantee",
      "Custom integrations",
      "White-label option"
    ],
    cta: "Contact Sales",
    highlighted: false
  }
];

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 }
};

export default function Home() {
  return (
    <div className="relative">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-accent-cyan/5 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <Zap size={14} className="text-accent-light" />
              <span className="text-xs font-semibold text-accent-light tracking-wider uppercase">
                Cloud Streaming Platform
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
              <span className="text-text-primary">Stream to YouTube.</span>
              <br />
              <span className="gradient-text">Schedule once.</span>
              <br />
              <span className="text-text-primary">Run 24/7 from the cloud.</span>
            </h1>

            {/* Subheading */}
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-text-secondary leading-relaxed mb-10">
              Your own OBS Studio in the cloud. Upload videos, build playlists,
              set schedules, and let the cloud streaming engine broadcast to YouTube — even
              when your computer is off.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <NavLink to="/signup">
                <Button variant="accent" size="lg" className="text-base px-8">
                  <Play size={18} />
                  Start Streaming
                </Button>
              </NavLink>
              <NavLink to="/dashboard">
                <Button variant="outline" size="lg" className="text-base px-8">
                  Explore Dashboard
                  <ArrowRight size={18} />
                </Button>
              </NavLink>
            </div>
          </motion.div>

          {/* Dashboard preview mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 1,
              delay: 0.3
            }}
            className="mt-16 relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-b from-accent/10 to-transparent rounded-3xl blur-2xl" />
            <div className="relative glass-card p-1 rounded-2xl border border-border-hover">
              <div className="bg-surface rounded-xl p-4 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-status-error" />
                  <div className="w-3 h-3 rounded-full bg-status-warning" />
                  <div className="w-3 h-3 rounded-full bg-status-success" />
                  <span className="ml-2 text-xs text-text-muted">
                    dashboard — MR RAJPOOT STUDIO
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="glass-card p-3 sm:p-4 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-text-muted mb-1">
                      Active Streams
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-text-primary">
                      2
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-live opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-status-live" />
                      </span>
                      <span className="text-[10px] text-status-live font-medium">
                        LIVE
                      </span>
                    </div>
                  </div>
                  <div className="glass-card p-3 sm:p-4 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-text-muted mb-1">
                      Scheduled
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-text-primary">
                      6
                    </p>
                    <p className="text-[10px] text-status-scheduled mt-1">
                      Queued
                    </p>
                  </div>
                  <div className="glass-card p-3 sm:p-4 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-text-muted mb-1">
                      Total Hours
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-text-primary">
                      482h
                    </p>
                    <p className="text-[10px] text-status-success mt-1">
                      ↑ 12% this week
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              Everything you need to
              <span className="gradient-text"> stream 24/7</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              A complete cloud streaming platform with professional-grade tools,
              built for creators who want reliability without the complexity.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08
                }}
              >
                <Card hover className="h-full">
                  <div className="p-3 w-fit rounded-xl bg-accent/10 mb-4">
                    <feature.icon size={22} className="text-accent-light" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ───────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-surface opacity-50" />
        <div className="max-w-5xl mx-auto relative">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              How it works
            </h2>
            <p className="text-text-secondary text-lg">
              Three simple steps from upload to live stream.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative"
              >
                <div className="glass-card p-8 rounded-2xl relative z-10 h-full flex flex-col">
                  <span className="text-4xl font-extrabold gradient-text mb-4">
                    {step.step}
                  </span>
                  <h3 className="text-xl font-bold text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed flex-1">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
              Simple, transparent
              <span className="gradient-text"> pricing</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Start free, upgrade when you need more streams and storage.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card
                  hover
                  className={`h-full flex flex-col relative ${
                    plan.highlighted
                      ? "border-accent shadow-glow"
                      : ""
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-accent text-xs font-semibold text-white">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-text-primary mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-text-primary">
                      {plan.price}
                    </span>
                    <span className="text-sm text-text-muted">
                      {plan.period}
                    </span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2.5 text-sm text-text-secondary"
                      >
                        <Check
                          size={16}
                          className="text-status-success shrink-0"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <NavLink to="/signup" className="w-full">
                    <Button
                      variant={plan.highlighted ? "accent" : "outline"}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </NavLink>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative glass-card p-8 sm:p-12 rounded-3xl border border-accent/20 overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-accent-cyan/10" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
                Ready to stream 24/7?
              </h2>
              <p className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto mb-8">
                Join creators who run continuous YouTube broadcasts without keeping their PC on.
              </p>
              <NavLink to="/signup">
                <Button variant="accent" size="lg" className="text-base px-8 shadow-glow">
                  <Play size={18} />
                  Get Started Free
                </Button>
              </NavLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
