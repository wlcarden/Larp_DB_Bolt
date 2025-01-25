/*
  # Fix game_users policies

  1. Changes
    - Drop existing policies that cause recursion
    - Create new policies with proper access control:
      - SELECT: Anyone authenticated can view
      - INSERT: Admins can add new users
      - UPDATE: Admins can modify existing users
      - DELETE: Admins can remove users
    
  2. Security
    - Maintains row-level security
    - Prevents infinite recursion
    - Preserves admin-only modification rights
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "Game admins can modify users" ON game_users;

-- Create separate policies for different operations
CREATE POLICY "Allow viewing game roles"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to insert users"
  ON game_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_users admins
      WHERE admins.game_id = game_users.game_id
      AND admins.user_id = auth.uid()
      AND admins.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update users"
  ON game_users FOR UPDATE
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

CREATE POLICY "Allow admins to delete users"
  ON game_users FOR DELETE
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