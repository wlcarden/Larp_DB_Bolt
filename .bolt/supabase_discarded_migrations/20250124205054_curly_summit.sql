/*
  # Update Game Users Table Policies

  1. Changes
    - Drop existing game_users policies
    - Add new policies for app admins and game admins
    - Keep existing policy for authenticated users to view game users

  2. Security
    - App admins can perform all operations on game_users
    - Game admins can manage users for their games
    - All authenticated users can view game users
*/

-- Drop existing game_users policies
DROP POLICY IF EXISTS "Allow viewing game roles" ON game_users;
DROP POLICY IF EXISTS "Allow admins to insert users" ON game_users;
DROP POLICY IF EXISTS "Allow admins to update users" ON game_users;
DROP POLICY IF EXISTS "Allow admins to delete users" ON game_users;

-- Create new policies
CREATE POLICY "Anyone can view game users"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "App admins can manage game users"
  ON game_users
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

CREATE POLICY "Game admins can manage their game users"
  ON game_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users admins
      WHERE admins.game_id = game_users.game_id
      AND admins.user_id = auth.uid()
      AND admins.role = 'admin'
      AND admins.id != game_users.id
    )
  );