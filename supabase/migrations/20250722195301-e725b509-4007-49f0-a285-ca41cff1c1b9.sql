-- Update your current user to be a super admin for testing
UPDATE profiles 
SET role = 'super_admin'::user_role 
WHERE user_id = auth.uid();