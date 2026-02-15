-- Add role column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Update existing users to have 'user' role if null
UPDATE public.users 
SET role = 'user' 
WHERE role IS NULL;
