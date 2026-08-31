import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Layouts
import PublicLayout from "../../components/layout/PublicLayout";
import AppLayout from "../../components/layout/AppLayout";
import AdminLayout from "../../components/layout/AdminLayout";

// Route Guards
import PublicRoute from "../../components/layout/PublicRoute";
import ProtectedRoute from "../../components/layout/ProtectedRoute";
import AdminRoute from "../../components/layout/AdminRoute";

// Public pages
import Home from "../../pages/Home";
import About from "../../pages/About";
import Login from "../../pages/Login";
import Signup from "../../pages/Signup";

import AuthCallback from "../../pages/AuthCallback";

// App pages
import Dashboard from "../../pages/Dashboard";
import Studio from "../../pages/Studio";
import Streams from "../../pages/Streams";
import Schedules from "../../pages/Schedules";
import Playlists from "../../pages/Playlists";
import Media from "../../pages/Media";
import Analytics from "../../pages/Analytics";
import Settings from "../../pages/Settings";
import Billing from "../../pages/Billing";

// Admin pages
import AdminDashboard from "../../pages/Admin/Dashboard";
import AdminUsers from "../../pages/Admin/Users";
import AdminStreams from "../../pages/Admin/Streams";
import AdminSchedules from "../../pages/Admin/Schedules";
import AdminMedia from "../../pages/Admin/Media";
import AdminWorkers from "../../pages/Admin/Workers";
import AdminLogs from "../../pages/Admin/Logs";
import AdminSettings from "../../pages/Admin/Settings";
import AdminBilling from "../../pages/Admin/Billing";

const router = createBrowserRouter([
  // ── Public routes ──
  {
    element: (
      <PublicRoute>
        <PublicLayout />
      </PublicRoute>
    ),
    children: [
      { path: "/", element: <Home /> },
      { path: "/features", element: <Home /> },
      { path: "/about", element: <About /> },
      { path: "/pricing", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
    ],
  },
  
  // ── Auth Callback (Unguarded) ──
  { path: "/auth/callback", element: <AuthCallback /> },

  // ── Authenticated app routes ──
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/studio", element: <Studio /> },
      { path: "/streams", element: <Streams /> },
      { path: "/schedules", element: <Schedules /> },
      { path: "/playlists", element: <Playlists /> },
      { path: "/media", element: <Media /> },
      { path: "/analytics", element: <Analytics /> },
      { path: "/billing", element: <Billing /> },
      { path: "/settings", element: <Settings /> },
    ],
  },

  // ── Admin routes ──
  {
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { path: "/admin", element: <AdminDashboard /> },
      { path: "/admin/billing", element: <AdminBilling /> },
      { path: "/admin/users", element: <AdminUsers /> },
      { path: "/admin/streams", element: <AdminStreams /> },
      { path: "/admin/schedules", element: <AdminSchedules /> },
      { path: "/admin/media", element: <AdminMedia /> },
      { path: "/admin/workers", element: <AdminWorkers /> },
      { path: "/admin/logs", element: <AdminLogs /> },
      { path: "/admin/settings", element: <AdminSettings /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
