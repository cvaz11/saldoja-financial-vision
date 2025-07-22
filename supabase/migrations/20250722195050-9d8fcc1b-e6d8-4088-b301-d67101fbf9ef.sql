-- Update your current user to be a super admin for testing
UPDATE profiles 
SET role = 'super_admin'::user_role 
WHERE user_id = auth.uid();

-- Fix the get_current_user_role function to handle null cases
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'user'::user_role
  );
$$;