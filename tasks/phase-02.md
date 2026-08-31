# MR RAJPOOT STUDIO - Phase 02 Tasks

## Goals
- Connect frontend to real Supabase Authentication
- Replace mock Zustand users with a verified session
- Implement route guards for protected and admin pages
- Guarantee robust session initialization, login, and registration

## Checklists
- [x] Configure `@tanstack/react-query` and Supabase Client
- [x] Implement Profile initialization using Postgres Triggers
- [x] Integrate Signup form with `AuthService`
- [x] Integrate Login form with `AuthService`
- [x] Implement `<ProtectedRoute>`, `<PublicRoute>`, `<AdminRoute>`
- [x] Set default role to `user` (prevent client from escalating privileges)
- [x] Implement UI Loading states during `INITIALIZING` phase
- [ ] Manual verification via localhost


## Bug Fixes
- **Login Crash**: Fixed a ReferenceError (password is not defined) in src/pages/Login/index.tsx at line 128 caused by a missing local state declaration. Restored const [password, setPassword] = useState(''); and verified that data flows correctly to AuthService.signIn().
