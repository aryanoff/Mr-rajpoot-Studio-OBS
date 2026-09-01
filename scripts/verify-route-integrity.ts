import fs from 'fs';
import path from 'path';

interface RouteDefinition {
  path: string;
  component: string;
  type: 'Public' | 'Auth' | 'User' | 'Admin';
}

const routes: RouteDefinition[] = [
  // Public
  { path: '/', component: 'src/pages/Home/index.tsx', type: 'Public' },
  { path: '/features', component: 'src/pages/Home/index.tsx', type: 'Public' },
  { path: '/about', component: 'src/pages/About/index.tsx', type: 'Public' },
  { path: '/pricing', component: 'src/pages/Home/index.tsx', type: 'Public' },
  { path: '/login', component: 'src/pages/Login/index.tsx', type: 'Public' },
  { path: '/signup', component: 'src/pages/Signup/index.tsx', type: 'Public' },
  { path: '/auth/callback', component: 'src/pages/AuthCallback.tsx', type: 'Auth' },

  // User App
  { path: '/dashboard', component: 'src/pages/Dashboard/index.tsx', type: 'User' },
  { path: '/studio', component: 'src/pages/Studio/index.tsx', type: 'User' },
  { path: '/streams', component: 'src/pages/Streams/index.tsx', type: 'User' },
  { path: '/schedules', component: 'src/pages/Schedules/index.tsx', type: 'User' },
  { path: '/playlists', component: 'src/pages/Playlists/index.tsx', type: 'User' },
  { path: '/media', component: 'src/pages/Media/index.tsx', type: 'User' },
  { path: '/analytics', component: 'src/pages/Analytics/index.tsx', type: 'User' },
  { path: '/billing', component: 'src/pages/Billing/index.tsx', type: 'User' },
  { path: '/settings', component: 'src/pages/Settings/index.tsx', type: 'User' },

  // Admin
  { path: '/admin', component: 'src/pages/Admin/Dashboard.tsx', type: 'Admin' },
  { path: '/admin/billing', component: 'src/pages/Admin/Billing.tsx', type: 'Admin' },
  { path: '/admin/users', component: 'src/pages/Admin/Users.tsx', type: 'Admin' },
  { path: '/admin/streams', component: 'src/pages/Admin/Streams.tsx', type: 'Admin' },
  { path: '/admin/schedules', component: 'src/pages/Admin/Schedules.tsx', type: 'Admin' },
  { path: '/admin/media', component: 'src/pages/Admin/Media.tsx', type: 'Admin' },
  { path: '/admin/workers', component: 'src/pages/Admin/Workers.tsx', type: 'Admin' },
  { path: '/admin/logs', component: 'src/pages/Admin/Logs.tsx', type: 'Admin' },
  { path: '/admin/settings', component: 'src/pages/Admin/Settings.tsx', type: 'Admin' },
];

console.log("======================================================================");
console.log("MR RAJPOOT STUDIO OBS 24/7 — RUNTIME ROUTE MATRIX INTEGRITY AUDIT");
console.log("======================================================================\n");

let failures = 0;

for (const r of routes) {
  const resolvedPath = path.resolve(r.component);
  const exists = fs.existsSync(resolvedPath);
  const mark = exists ? '✓ OK' : '✗ MISSING';
  if (!exists) failures++;
  console.log(`[${r.type.padEnd(7)}] ${r.path.padEnd(18)} -> ${r.component.padEnd(35)} [${mark}]`);
}

console.log("\n----------------------------------------------------------------------");
console.log(`Total Routes Verified: ${routes.length}`);
console.log(`Passed: ${routes.length - failures}`);
console.log(`Failed: ${failures}`);

if (failures === 0) {
  console.log("✓ ALL 25 APPLICATION ROUTES EXIST AND RESOLVE CLEANLY.");
  process.exit(0);
} else {
  console.error("✗ SOME ROUTE TARGETS DO NOT EXIST ON DISK.");
  process.exit(1);
}
