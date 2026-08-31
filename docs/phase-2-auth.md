# Phase 2 — Authentication & Identity

## Overview
Replaced the mock Zustand authentication with a real Supabase Auth integration, implementing secure user registration, login, logout, and protected routing.

## Supabase Setup
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used for frontend initialization.
- A Supabase project must be configured with a `.env` file (see `.env.example`).
- A `profiles` table is initialized with an `on_auth_user_created` trigger that handles new user registration directly on the database level.

## Profiles Table & Trigger
- **Table**: `public.profiles`
- **Fields**: `id`, `user_id` (refs `auth.users`), `full_name`, `username`, `role`, `status`.
- **Trigger**: Ensures a `profiles` row is created synchronously when a user signs up. 
- **Security**: The default role is `user`. Normal users cannot modify their role (enforced via DB trigger `check_profile_security`). RLS ensures users can only update their own profile fields.

## Auth Service & State
- **`src/features/auth/auth.service.ts`**: Wrappers for `signUp`, `signIn`, `signOut`, `resetPassword`, and error normalization.
- **`src/stores/auth.store.ts`**: Hydrates from Supabase on startup and listens to `onAuthStateChange`. 
- **`INITIALIZING` state**: Shows a branded loading screen instead of flashing the login page while determining the user's session.

## Route Guards
- `PublicRoute`: Blocks authenticated users from `/login` and `/signup` and redirects them to `/dashboard`.
- `ProtectedRoute`: Blocks unauthenticated users and redirects them to `/login`.
- `AdminRoute`: Verifies the `useProfile()` role before granting access to `/admin` routes.

## Known Limitations / Next Steps
- Automated browser testing is blocked by CDN constraints, requiring manual QA via `http://localhost:5173/`.
- Full application-wide RLS is scheduled for Phase 3. The current RLS only protects the `profiles` table.
- A secure process to bootstrap the initial `admin` user needs to be documented or executed on the backend (e.g., via `SUPABASE_SERVICE_ROLE_KEY` in a Node script).


## Bug Fixes
- **Login Crash**: Fixed a ReferenceError (password is not defined) in src/pages/Login/index.tsx at line 128 caused by a missing local state declaration. Restored const [password, setPassword] = useState(''); and verified that data flows correctly to AuthService.signIn().
