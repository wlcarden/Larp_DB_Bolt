-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;
DROP POLICY IF EXISTS "Allow self-registration as writer" ON game_users;

-- Create new policies
-- Allow unconditional read access for authenticated users
CREATE POLICY "Public read access"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

-- App admins can manage all users
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

-- Game admins can manage users in their games (split by operation)
CREATE POLICY "Game admins can add users"
  ON game_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_users existing
      WHERE existing.game_id = game_users.game_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'admin'
    )
  );

CREATE POLICY "Game admins can update users"
  ON game_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users existing
      WHERE existing.game_id = game_users.game_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'admin'
    )
  );

CREATE POLICY "Game admins can delete users"
  ON game_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users existing
      WHERE existing.game_id = game_users.game_id
      AND existing.user_id = auth.uid()
      AND existing.role = 'admin'
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