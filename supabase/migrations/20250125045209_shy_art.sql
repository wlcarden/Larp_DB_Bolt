-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;
DROP POLICY IF EXISTS "Game admins can add users" ON game_users;
DROP POLICY IF EXISTS "Game admins can update users" ON game_users;
DROP POLICY IF EXISTS "Game admins can delete users" ON game_users;
DROP POLICY IF EXISTS "Allow self-registration as writer" ON game_users;

-- Create new simplified policies
-- Allow unconditional read access for authenticated users
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