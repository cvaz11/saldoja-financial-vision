-- Add admin role functionality to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create an enum for roles
CREATE TYPE IF NOT EXISTS user_role AS ENUM ('user', 'admin', 'super_admin');

-- Update the role column to use the enum (after adding the column with default values)
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role USING role::user_role;

-- Create RLS policy for admin access
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
  OR auth.uid() = user_id
);

-- Update existing profile update policy to allow role updates for super admins
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;

CREATE POLICY "Users can update own profile and super admins can update roles" ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'super_admin'
  )
);

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on admin logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin logs (only super admins can view)
CREATE POLICY "Super admins can view admin logs" ON public.admin_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'super_admin'
  )
);

-- Policy for inserting admin logs
CREATE POLICY "Admins can insert logs" ON public.admin_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);