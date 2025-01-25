/*
  # Add System Admin Role and Policies

  1. Changes
    - Add system_admin role to auth.users
    - Update system policies to allow system admins full control
    - Keep existing game admin policies intact

  2. Security
    - Only system admins can create/edit/delete systems
    - Game admins can still view systems
    - Regular users can only view systems
*/

-- Create an enum type for system admin role
CREATE TYPE system_role AS ENUM ('system_admin');

-- Add system_role column to auth.users
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS system_role system_role;

-- Drop existing system policies
DROP POLICY IF EXISTS "Anyone can view systems" ON systems;
DROP POLICY IF EXISTS "Only game admins can modify systems" ON systems;

-- Create new system policies
CREATE POLICY "Anyone can view systems"
  ON systems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage systems"
  ON systems
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'system_role' = 'system_admin'::text)
  WITH CHECK (auth.jwt() ->> 'system_role' = 'system_admin'::text);