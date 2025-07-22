-- Update current user to super_admin role for testing
UPDATE profiles 
SET role = 'super_admin' 
WHERE user_id = (SELECT auth.uid());