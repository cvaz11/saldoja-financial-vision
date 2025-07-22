-- Add admin role functionality to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create an enum for roles (without IF NOT EXISTS as it's not supported)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
    END IF;
END $$;

-- Update existing NULL/empty role values to 'user' before type conversion
UPDATE public.profiles SET role = 'user' WHERE role IS NULL OR role = '';

-- Drop the default temporarily, convert the column type, then re-add default
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user'::user_role;

-- Create security definer function to get current user role (to avoid infinite recursion in RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create RLS policy for admin access
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT
USING (
  public.get_current_user_role() IN ('admin', 'super_admin')
  OR auth.uid() = user_id
);

-- Update existing profile update policy to allow role updates for super admins
DROP POLICY IF EXISTS "Users can update own profile and super admins can update roles" ON public.profiles;

CREATE POLICY "Users can update own profile and super admins can update roles" ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.get_current_user_role() = 'super_admin'
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
USING (public.get_current_user_role() = 'super_admin');

-- Policy for inserting admin logs
CREATE POLICY "Admins can insert logs" ON public.admin_logs
FOR INSERT
WITH CHECK (public.get_current_user_role() IN ('admin', 'super_admin'));