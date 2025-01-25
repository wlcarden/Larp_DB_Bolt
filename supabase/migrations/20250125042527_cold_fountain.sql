/*
  # Remove self-registration and simplify user management
  
  1. Changes
    - Remove self-registration policy
    - Keep public read access
    - Restrict all user management to app admins only
  
  2. Security
    - Makes game_users data publicly readable
    - Only app admins can add/modify/delete users
    - No self-registration
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON game_users;
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