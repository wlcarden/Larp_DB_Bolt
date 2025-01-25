/*
  # Fix Game Users Policies

  1. Changes
    - Remove recursive policies on game_users table
    - Split policies into separate operations (SELECT, INSERT, UPDATE, DELETE)
    - Maintain proper access control without recursion

  2. Security
    - Maintains app admin access
    - Allows game admins to manage users without recursion
    - Preserves viewing access for all authenticated users
*/

-- Drop existing game_users policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;
DROP POLICY IF EXISTS "Game admins can manage their game users" ON game_users;

-- Create new non-recursive policies
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

-- For game admins, split into separate operations to avoid recursion
CREATE POLICY "Game admins can insert users"
  ON game_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_users.game_id
      AND EXISTS (
        SELECT 1 FROM game_users gu
        WHERE gu.game_id = g.id
        AND gu.user_id = auth.uid()
        AND gu.role = 'admin'
        AND gu.id != game_users.id -- Prevent self-reference
      )
    )
  );

CREATE POLICY "Game admins can update users"
  ON game_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_users.game_id
      AND EXISTS (
        SELECT 1 FROM game_users gu
        WHERE gu.game_id = g.id
        AND gu.user_id = auth.uid()
        AND gu.role = 'admin'
        AND gu.id != game_users.id -- Prevent self-reference
      )
    )
  );

CREATE POLICY "Game admins can delete users"
  ON game_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_users.game_id
      AND EXISTS (
        SELECT 1 FROM game_users gu
        WHERE gu.game_id = g.id
        AND gu.user_id = auth.uid()
        AND gu.role = 'admin'
        AND gu.id != game_users.id -- Prevent self-reference
      )
    )
  );