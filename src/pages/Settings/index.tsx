import { useState } from "react";
import { motion } from "framer-motion";
import { User, Shield, Radio, Bell, HardDrive, CreditCard, Save, Monitor, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuthStore } from "../../stores/auth.store";
import { useProfile, useUpdateProfile } from "../../features/auth/auth.hooks";
import Switch from "../../components/ui/Switch";
import { ThemeToggleSettingsVariant } from "../../components/ui/ThemeToggle";
import PageHeader from "../../components/ui/PageHeader";

type Tab = "profile" | "security" | "streaming" | "notifications" | "media";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "streaming", label: "Streaming", icon: Radio },
  { id: "media", label: "Media & Storage", icon: HardDrive },
  { id: "notifications", label: "Notifications", icon: Bell },
];

function ProfileSettingsTab({ profile, user }: { profile: any; user: any }) {
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [statusMsg, setStatusMsg] = useState("");
  const updateProfile = useUpdateProfile();

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ fullName, username });
      setStatusMsg("Profile updated successfully!");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (e: any) {
      setStatusMsg(e.message || "Failed to update profile");
    }
  };

  return (
    <Card variant="glass">
      <h2 className="text-lg font-semibold text-text-primary mb-6">
        Profile Settings
      </h2>
      <div className="space-y-4 max-w-lg">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center overflow-hidden shadow-glow">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-white" />
            )}
          </div>
          <div>
            <Button variant="secondary" size="sm">
              Change Avatar
            </Button>
            <p className="text-xs text-text-muted mt-1">
              JPG, PNG — Max 2 MB
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Full Name</label>
          <Input 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Username</label>
          <Input 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Username"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Email</label>
          <Input 
            type="email" 
            value={user?.email || ""} 
            disabled 
            className="opacity-70 cursor-not-allowed"
          />
        </div>
        
        <hr className="border-border my-6" />
        
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Appearance</h3>
          <div className="flex items-center gap-4">
            <p className="text-sm text-text-secondary flex-1">Application theme mode</p>
            <div className="bg-surface-2 border border-border p-1 rounded-xl shadow-inner inline-flex">
              <ThemeToggleSettingsVariant />
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 p-3 bg-status-success-bg/20 border border-status-success/30 text-status-success text-xs rounded-xl">
            <CheckCircle2 size={14} />
            {statusMsg}
          </div>
        )}

        <Button 
          variant="accent" 
          size="md" 
          className="mt-6" 
          onClick={handleSave}
          disabled={updateProfile.isPending}
        >
          <Save size={16} />
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </Card>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { user } = useAuthStore();
  const { data: profile } = useProfile();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings"
        description="Manage your account and preferences"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab navigation */}
        <div className="lg:w-56 shrink-0">
          <Card variant="glass" padding="sm">
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-accent/10 text-accent-light border border-accent/20"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
              
              <hr className="border-border my-2" />

              <Link
                to="/billing"
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-accent-light" />
                  <span>Billing & Plans</span>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-accent/10 text-accent-light">
                  Manage
                </span>
              </Link>
            </div>
          </Card>
        </div>

        {/* Tab content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "profile" && (
              <ProfileSettingsTab key={profile?.id || "profile"} profile={profile} user={user} />
            )}

            {activeTab === "security" && (
              <Card variant="glass">
                <h2 className="text-lg font-semibold text-text-primary mb-6">
                  Security Settings
                </h2>
                <div className="space-y-6 max-w-lg">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                      Change Password
                    </h3>
                    <Input label="Current Password" type="password" placeholder="••••••••" />
                    <Input label="New Password" type="password" placeholder="Min 8 characters" />
                    <Input label="Confirm New Password" type="password" placeholder="Re-enter password" />
                    <Button variant="accent" size="md">
                      Update Password
                    </Button>
                  </div>
                  <hr className="border-border" />
                  <div>
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                      Active Sessions
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-surface-2 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Monitor size={18} className="text-text-muted" />
                          <div>
                            <p className="text-sm text-text-primary">Windows — Chrome</p>
                            <p className="text-xs text-text-muted">Current session</p>
                          </div>
                        </div>
                        <span className="text-xs text-status-success font-medium">Active</span>
                      </div>
                    </div>
                    <Button variant="danger" size="sm" className="mt-3">
                      Logout All Other Sessions
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === "streaming" && (
              <Card variant="glass">
                <h2 className="text-lg font-semibold text-text-primary mb-6">
                  Streaming Defaults
                </h2>
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">Default Resolution</label>
                    <select className="w-full h-10 px-3 bg-surface-2 border border-border rounded-xl text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent/50">
                      <option>1920×1080</option>
                      <option>1280×720</option>
                      <option>854×480</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-text-secondary mb-1.5 block">Default FPS</label>
                      <select className="w-full h-10 px-3 bg-surface-2 border border-border rounded-xl text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent/50">
                        <option>30</option>
                        <option>60</option>
                        <option>24</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-text-secondary mb-1.5 block">Default Bitrate</label>
                      <select className="w-full h-10 px-3 bg-surface-2 border border-border rounded-xl text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent/50">
                        <option>4 Mbps</option>
                        <option>6 Mbps</option>
                        <option>2 Mbps</option>
                      </select>
                    </div>
                  </div>
                  <Button variant="accent" size="md">
                    <Save size={16} />
                    Save Defaults
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === "media" && (
              <Card variant="glass">
                <h2 className="text-lg font-semibold text-text-primary mb-6">
                  Media & Storage
                </h2>
                <div className="space-y-4 max-w-lg">
                  <div className="flex items-center justify-between p-3 bg-surface-2 border border-border rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Auto-delete completed media</p>
                      <p className="text-xs text-text-muted">Automatically remove files after streams finish successfully.</p>
                    </div>
                    <Switch
                      defaultChecked
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-text-secondary mb-1.5 block">Retention Period</label>
                      <select defaultValue="24" className="w-full h-10 px-3 bg-surface-2 border border-border rounded-xl text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent/50">
                        <option value="1">1 hour</option>
                        <option value="6">6 hours</option>
                        <option value="12">12 hours</option>
                        <option value="24">24 hours</option>
                        <option value="168">7 days</option>
                        <option value="720">30 days</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-surface-2 border border-border rounded-xl mt-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Keep media required by future schedules</p>
                      <p className="text-xs text-text-muted">Prevents auto-deletion if the media is assigned to an upcoming stream.</p>
                    </div>
                    <Switch
                      defaultChecked
                      disabled
                    />
                  </div>
                  <p className="text-[10px] text-text-muted px-1">Note: Dependency protection is enforced at the server level.</p>
                  
                  <Button variant="accent" size="md" className="mt-6">
                    <Save size={16} />
                    Save Media Settings
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === "notifications" && (
              <Card variant="glass">
                <h2 className="text-lg font-semibold text-text-primary mb-6">
                  Notification Preferences
                </h2>
                <div className="space-y-4 max-w-lg">
                  {[
                    { label: "Stream failures", desc: "Get notified when a stream fails or crashes" },
                    { label: "Schedule reminders", desc: "Reminders before a scheduled stream starts" },
                    { label: "Engine alerts", desc: "Alert when streaming engine encounters connection issues" },
                    { label: "Stream started", desc: "Notification when a stream goes live" },
                    { label: "Stream completed", desc: "Notification when a stream ends normally" },
                  ].map((item, i) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 bg-surface-2 rounded-xl"
                    >
                      <div>
                        <p className="text-sm text-text-primary font-medium">{item.label}</p>
                        <p className="text-xs text-text-muted">{item.desc}</p>
                      </div>
                      <Switch
                        defaultChecked={i < 3}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
