-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;
DROP POLICY IF EXISTS "Game admins can add users" ON game_users;
DROP POLICY IF EXISTS "Game admins can modify users" ON game_users;
DROP POLICY IF EXISTS "Game admins can remove users" ON game_users;
DROP POLICY IF EXISTS "Allow self-registration as writer" ON game_users;

-- Drop materialized view and related objects if they exist
DROP MATERIALIZED VIEW IF EXISTS game_admin_permissions;
DROP TRIGGER IF EXISTS refresh_game_admin_permissions_trigger ON game_users;
DROP FUNCTION IF EXISTS refresh_game_admin_permissions();

-- Create simplified policies
-- Allow viewing for all authenticated users
CREATE POLICY "Anyone can view game roles"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

-- App admins have full access to manage users
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