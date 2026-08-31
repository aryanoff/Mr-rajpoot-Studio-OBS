-- Manual Test Script for RLS Verification
-- Run this in Supabase SQL Editor

-- 1. Create a mock user in auth.users and public.profiles
-- You must substitute valid UUIDs for testing or use an existing user from your database.

-- Example flow:
-- SET request.jwt.claims TO '{ "sub": "YOUR_USER_UUID", "role": "authenticated" }';

-- 2. Try inserting a stream
-- INSERT INTO public.streams (user_id, title) VALUES ('YOUR_USER_UUID', 'Test Stream');

-- 3. Verify read access
-- SELECT * FROM public.streams;

-- 4. Try elevating role as a regular user (should fail)
-- SELECT public.elevate_user_role('YOUR_USER_UUID', 'admin');

-- 5. Elevate manually via superuser (temporarily reset claims)
-- SET request.jwt.claims TO '';
-- UPDATE public.profiles SET role = 'admin' WHERE user_id = 'YOUR_USER_UUID';

-- 6. Try elevating role again as admin (should succeed)
-- SET request.jwt.claims TO '{ "sub": "YOUR_USER_UUID", "role": "authenticated" }';
-- SELECT public.elevate_user_role('ANOTHER_USER_UUID', 'admin');

