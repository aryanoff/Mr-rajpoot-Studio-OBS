-- Admin Check Helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  user_role public.user_role;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE user_id = auth.uid();
  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update profile security trigger to allow admins
CREATE OR REPLACE FUNCTION check_profile_security()
RETURNS trigger AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to modify restricted profile fields';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Role elevation RPC
CREATE OR REPLACE FUNCTION public.elevate_user_role(target_user_id uuid, new_role public.user_role)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can elevate roles';
  END IF;

  UPDATE public.profiles SET role = new_role WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

