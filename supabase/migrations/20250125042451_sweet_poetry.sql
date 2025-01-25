/*
  # Simplify game_users policies
  
  1. Changes
    - Remove all existing policies
    - Create new simplified policies:
      - Everyone can read game_users (no auth required)
      - Only app admins can manage users
      - Users can self-register as writers
  
  2. Security
    - Makes game_users data publicly readable
    - Restricts write operations to app admins only
    - Maintains self-registration capability
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;
DROP POLICY IF EXISTS "Allow self-registration as writer" ON game_users;

-- Create new simplified policies
-- Allow public read access
CREATE POLICY "Public read access"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

-- Only app admins can manage users
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

-- Allow self-registration as writer
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