/*
  # Fix game_users policies UUID handling

  1. Changes
    - Drop existing policies
    - Create new policies with proper UUID handling
    - Remove COALESCE with integer comparison
    - Simplify policy logic to prevent recursion

  2. Security
    - Maintain all existing security rules
    - Fix UUID type handling
    - Prevent infinite recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;
DROP POLICY IF EXISTS "Game admins can add users" ON game_users;
DROP POLICY IF EXISTS "Game admins can modify users" ON game_users;
DROP POLICY IF EXISTS "Game admins can remove users" ON game_users;
DROP POLICY IF EXISTS "Allow self-registration as writer" ON game_users;

-- Create new policies
-- Allow viewing for all authenticated users
CREATE POLICY "Anyone can view game roles"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

-- App admins have full access
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

-- Allow users to join games as writers (self-registration)
CREATE POLICY "Allow self-registration as writer"
  ON game_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    role = 'writer' AND
    NOT EXISTS (
      SELECT 1 FROM game_users existing
      WHERE existing.game_id = game_users.game_id
      AND existing.user_id = auth.uid()
    )
  );

-- Game admin policies (using materialized admin list to prevent recursion)
CREATE POLICY "Game admins can add users"
  ON game_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM (
        SELECT DISTINCT game_id 
        FROM game_users 
        WHERE user_id = auth.uid()
        AND role = 'admin'
      ) admins
      WHERE admins.game_id = game_users.game_id
    )
  );

CREATE POLICY "Game admins can modify users"
  ON game_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM (
        SELECT DISTINCT game_id 
        FROM game_users 
        WHERE user_id = auth.uid()
        AND role = 'admin'
      ) admins
      WHERE admins.game_id = game_users.game_id
    ) AND
    user_id != auth.uid() -- Prevent self-modification
  );

CREATE POLICY "Game admins can remove users"
  ON game_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM (
        SELECT DISTINCT game_id 
        FROM game_users 
        WHERE user_id = auth.uid()
        AND role = 'admin'
      ) admins
      WHERE admins.game_id = game_users.game_id
    ) AND
    user_id != auth.uid() -- Prevent self-deletion
  );