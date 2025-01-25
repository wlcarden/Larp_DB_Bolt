/*
  # Fix app_admins policies to prevent recursion

  1. Changes
    - Drop existing recursive policy
    - Add separate policies for insert/update/delete operations
    - Keep the select policy unchanged
*/

-- Drop the recursive policy
DROP POLICY IF EXISTS "App admins can manage app admins" ON app_admins;

-- Keep the existing select policy
DROP POLICY IF EXISTS "Anyone can view app admins" ON app_admins;
CREATE POLICY "Anyone can view app admins"
  ON app_admins FOR SELECT
  TO authenticated
  USING (true);

-- Add separate policies for management operations
CREATE POLICY "Initial admin can insert app admins"
  ON app_admins FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM app_admins
      WHERE user_id = 'dcedf5ac-9766-4e28-a232-3d9844092008' -- Initial admin ID
    )
  );

CREATE POLICY "Initial admin can update app admins"
  ON app_admins FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM app_admins
      WHERE user_id = 'dcedf5ac-9766-4e28-a232-3d9844092008' -- Initial admin ID
    )
  );

CREATE POLICY "Initial admin can delete app admins"
  ON app_admins FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM app_admins
      WHERE user_id = 'dcedf5ac-9766-4e28-a232-3d9844092008' -- Initial admin ID
    )
  );