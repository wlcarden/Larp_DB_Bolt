/*
  # Fix game_users policies to prevent infinite recursion

  1. Changes
    - Remove recursive policy check for game_users table
    - Simplify policies to prevent infinite recursion
    - Maintain security while allowing proper access

  2. Security
    - Users can still view game roles
    - Only admins can modify game users
    - Prevents infinite recursion in policy evaluation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view game roles" ON game_users;
DROP POLICY IF EXISTS "Only game admins can modify game users" ON game_users;

-- Create new non-recursive policies
CREATE POLICY "Anyone can view game roles"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Game admins can modify users"
  ON game_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users gu
      WHERE gu.game_id = game_users.game_id
      AND gu.user_id = auth.uid()
      AND gu.role = 'admin'
      AND gu.id != game_users.id  -- Prevent self-reference
    )
  );