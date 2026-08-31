import { motion } from "framer-motion";
import { Save, Shield, Server } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          System Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure platform-wide settings
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* General */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card variant="glass">
            <div className="flex items-center gap-2 mb-6">
              <Server size={18} className="text-accent-light" />
              <h2 className="text-lg font-semibold text-text-primary">
                General
              </h2>
            </div>
            <div className="space-y-4">
              <Input label="Platform Name" defaultValue="MR RAJPOOT STUDIO" />
              <Input label="Support Email" defaultValue="support@rajpootstudio.com" />
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                  Max Concurrent Streams per User
                </label>
                <select className="w-full h-10 px-3 bg-surface-2 border border-border rounded-xl text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent/50">
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option selected>4</option>
                  <option>5</option>
                  <option>10</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                  Max Upload Size
                </label>
                <select className="w-full h-10 px-3 bg-surface-2 border border-border rounded-xl text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent/50">
                  <option>25 MB</option>
                  <option selected>50 MB</option>
                  <option>100 MB</option>
                  <option>250 MB</option>
                  <option>500 MB</option>
                </select>
              </div>
              <Button variant="accent" size="md">
                <Save size={16} />
                Save Settings
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card variant="glass">
            <div className="flex items-center gap-2 mb-6">
              <Shield size={18} className="text-accent-light" />
              <h2 className="text-lg font-semibold text-text-primary">
                Security
              </h2>
            </div>
            <div className="space-y-4">
              {[
                { label: "Require email verification", enabled: true },
                { label: "Allow Google signup", enabled: true },
                { label: "Allow GitHub signup", enabled: false },
                { label: "Rate limiting enabled", enabled: true },
                { label: "Force HTTPS", enabled: true },
              ].map((setting) => (
                <div
                  key={setting.label}
                  className="flex items-center justify-between p-3 bg-surface-2 rounded-xl"
                >
                  <span className="text-sm text-text-primary">
                    {setting.label}
                  </span>
                  <button
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                      setting.enabled ? "bg-accent" : "bg-surface-3"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        setting.enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
