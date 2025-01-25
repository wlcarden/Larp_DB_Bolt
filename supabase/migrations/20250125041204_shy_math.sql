/*
  # Fix game_users policies

  1. Changes
    - Drop existing policies that could cause recursion
    - Create new non-recursive policies for managing users
    - Add separate policies for different operations

  2. Security
    - Allow viewing game roles
    - Allow app admins full access
    - Allow game admins to manage users without recursion
    - Allow new users to join as writers
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;
DROP POLICY IF EXISTS "Game admins can manage users in their games" ON game_users;
DROP POLICY IF EXISTS "New users can join games as writers" ON game_users;

-- Create new policies
CREATE POLICY "Anyone can view game roles"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

-- App admins can do everything
CREATE POLICY "App admins can manage game users"
  ON game_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );

-- Split game admin policies by operation to prevent recursion
CREATE POLICY "Game admins can insert users"
  ON game_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_users admin_check
      WHERE admin_check.game_id = game_users.game_id
      AND admin_check.user_id = auth.uid()
      AND admin_check.role = 'admin'
    )
  );

CREATE POLICY "Game admins can update users"
  ON game_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users admin_check
      WHERE admin_check.game_id = game_users.game_id
      AND admin_check.user_id = auth.uid()
      AND admin_check.role = 'admin'
      AND admin_check.id != game_users.id
    )
  );

CREATE POLICY "Game admins can delete users"
  ON game_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users admin_check
      WHERE admin_check.game_id = game_users.game_id
      AND admin_check.user_id = auth.uid()
      AND admin_check.role = 'admin'
      AND admin_check.id != game_users.id
    )
  );

-- Allow new users to join as writers
CREATE POLICY "New users can join as writers"
  ON game_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'writer' AND
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM game_users existing
      WHERE existing.game_id = game_users.game_id
      AND existing.user_id = auth.uid()
    )
  );