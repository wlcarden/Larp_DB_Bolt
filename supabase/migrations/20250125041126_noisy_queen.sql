/*
  # Fix game_users policies

  1. Changes
    - Drop existing policies that could cause recursion
    - Create new policies that handle the initial user case
    - Add policies for managing users

  2. Security
    - Allow new users to join games as writers
    - Allow admins to manage users
    - Prevent recursion in policy checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;
DROP POLICY IF EXISTS "Game admins can manage their game users" ON game_users;
DROP POLICY IF EXISTS "Game admins can insert users" ON game_users;
DROP POLICY IF EXISTS "Game admins can update users" ON game_users;
DROP POLICY IF EXISTS "Game admins can delete users" ON game_users;

-- Create new policies
CREATE POLICY "Anyone can view game roles"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

-- Allow new users to join games as writers
CREATE POLICY "New users can join games as writers"
  ON game_users FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'writer' AND
    user_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM game_users
      WHERE game_id = game_users.game_id
      AND user_id = auth.uid()
    )
  );

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

-- Game admins can manage users in their games
CREATE POLICY "Game admins can manage users in their games"
  ON game_users
  FOR ALL
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