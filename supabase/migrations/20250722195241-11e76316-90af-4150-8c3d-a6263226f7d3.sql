-- Drop and recreate the function properly
DROP FUNCTION IF EXISTS get_current_user_role();

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.profiles WHERE user_id = auth.uid()),
    'user'
  );
$$;

-- Update your current user to be a super admin for testing
UPDATE profiles 
SET role = 'super_admin'::user_role 
WHERE user_id = auth.uid();