import { motion } from "framer-motion";
import { Radio, Cloud, Shield, Users, Zap, Globe } from "lucide-react";
import Card from "../../components/ui/Card";

const values = [
  {
    icon: Cloud,
    title: "Cloud-First",
    description: "Everything runs in the cloud. No hardware dependencies, no downtime."
},
  {
    icon: Shield,
    title: "Security-First",
    description: "Stream keys encrypted server-side. Row-level security on all data."
},
  {
    icon: Zap,
    title: "Reliability",
    description: "Auto-recovery, health monitoring, and supervisor processes keep streams alive."
},
  {
    icon: Users,
    title: "Creator-Focused",
    description: "Built by creators, for creators. Every feature designed for real streaming workflows."
},
  {
    icon: Globe,
    title: "Global Reach",
    description: "Stream to YouTube from anywhere. Multi-timezone scheduling built in."
},
  {
    icon: Radio,
    title: "Professional Grade",
    description: "Full encoder control: resolution, FPS, bitrate, codec, and audio configuration."
},
];

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6,  }
};

export default function About() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary mb-6">
              About <span className="gradient-text">MR RAJPOOT STUDIO</span>
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
              We're building the future of cloud streaming — a platform where
              creators can run 24/7 live streams on YouTube without ever
              touching OBS or keeping their computer on.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 sm:px-6">
        <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
          <Card variant="glass" padding="lg">
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              Our Mission
            </h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Cloud streaming should be as easy as uploading a video and clicking
              "Go Live." We built MR RAJPOOT STUDIO to eliminate the complexity of
              maintaining OBS, managing FFmpeg, and keeping a computer running 24/7.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Whether you're running a LoFi radio station, a 24/7 news ticker, or
              cycling through your video content — your stream keeps going while you
              sleep, travel, or focus on creating more content.
            </p>
          </Card>
        </motion.div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              What We Believe In
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Card hover className="h-full">
                  <div className="p-3 w-fit rounded-xl bg-accent/10 mb-4">
                    <value.icon size={22} className="text-accent-light" />
                  </div>
                  <h3 className="text-base font-semibold text-text-primary mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {value.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 px-4 sm:px-6">
        <motion.div {...fadeInUp} className="max-w-3xl mx-auto">
          <Card variant="glass" padding="lg">
            <h2 className="text-2xl font-bold text-text-primary mb-6">
              Built With Modern Tech
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                "React",
                "TypeScript",
                "Vite",
                "Tailwind CSS",
                "Supabase",
                "FFmpeg",
                "Node.js",
                "YouTube RTMPS",
                "Framer Motion",
              ].map((tech) => (
                <div
                  key={tech}
                  className="px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm font-medium text-text-secondary text-center"
                >
                  {tech}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
