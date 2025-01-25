/*
  # Update systems policies to use app_admins table

  1. Changes
    - Drop existing policies that use system_role
    - Create new policies that check app_admins table
    - Keep the select policy unchanged
*/

-- Drop existing system policies
DROP POLICY IF EXISTS "Anyone can view systems" ON systems;
DROP POLICY IF EXISTS "System admins can manage systems" ON systems;

-- Create new system policies
CREATE POLICY "Anyone can view systems"
  ON systems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "App admins can manage systems"
  ON systems
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );