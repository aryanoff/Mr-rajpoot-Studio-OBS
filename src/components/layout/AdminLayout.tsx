import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar from "../navigation/Sidebar";
import Topbar from "../navigation/Topbar";
import { useUIStore } from "../../stores/ui.store";

export default function AdminLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="noise-overlay" />

      <Sidebar variant="admin" />

      <motion.div
        animate={{ marginLeft: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="min-h-screen lg:ml-64"
        style={{ marginLeft: undefined }}
      >
        <Topbar variant="admin" />

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
}
