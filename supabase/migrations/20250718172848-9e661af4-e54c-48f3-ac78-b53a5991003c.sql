-- Add new columns to profiles table for user settings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_marketing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS installment_alerts BOOLEAN DEFAULT true;