/*
  # Fix game_users policies

  1. Changes
    - Drop all existing policies
    - Create new non-recursive policies using subqueries
    - Add explicit checks for admin existence
    - Prevent self-modification in admin policies
    - Add separate policy for self-registration

  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Allow viewing by all authenticated users
    - Allow app admins full access
    - Allow game admins to manage users
    - Allow users to join as writers
*/

-- Drop all existing policies
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

-- Game admin policies (using subqueries to prevent recursion)
CREATE POLICY "Game admins can add users"
  ON game_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM (
        SELECT DISTINCT game_id, user_id, role 
        FROM game_users 
        WHERE role = 'admin'
      ) admins
      WHERE admins.game_id = game_users.game_id
      AND admins.user_id = auth.uid()
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
        SELECT DISTINCT game_id, user_id, role 
        FROM game_users 
        WHERE role = 'admin'
      ) admins
      WHERE admins.game_id = game_users.game_id
      AND admins.user_id = auth.uid()
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
        SELECT DISTINCT game_id, user_id, role 
        FROM game_users 
        WHERE role = 'admin'
      ) admins
      WHERE admins.game_id = game_users.game_id
      AND admins.user_id = auth.uid()
    ) AND
    user_id != auth.uid() -- Prevent self-deletion
  );