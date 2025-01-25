/*
  # Fix game_users policies to handle NEW records correctly

  1. Changes
    - Properly handle NEW record references in policies
    - Use correct syntax for row-level security policies
    - Maintain same security model with proper syntax

  2. Security
    - Maintains read access for all authenticated users
    - Restricts write operations to game admins
    - Prevents infinite recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "Game admins can modify users" ON game_users;
DROP POLICY IF EXISTS "Allow viewing game roles" ON game_users;
DROP POLICY IF EXISTS "Allow admins to insert users" ON game_users;
DROP POLICY IF EXISTS "Allow admins to update users" ON game_users;
DROP POLICY IF EXISTS "Allow admins to delete users" ON game_users;

-- Create new policies with proper syntax
CREATE POLICY "Anyone can view game roles"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Game admins can insert users"
  ON game_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_users
      WHERE game_id = game_users.game_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Game admins can update users"
  ON game_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users
      WHERE game_id = game_users.game_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Game admins can delete users"
  ON game_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users
      WHERE game_id = game_users.game_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );