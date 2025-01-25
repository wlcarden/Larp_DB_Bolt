-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;
DROP POLICY IF EXISTS "Game admins can add users" ON game_users;
DROP POLICY IF EXISTS "Game admins can modify users" ON game_users;
DROP POLICY IF EXISTS "Game admins can remove users" ON game_users;
DROP POLICY IF EXISTS "Allow self-registration as writer" ON game_users;

-- Create a view to materialize admin permissions
CREATE MATERIALIZED VIEW game_admin_permissions AS
SELECT DISTINCT game_id, user_id
FROM game_users
WHERE role = 'admin';

-- Create index for efficient lookups
CREATE UNIQUE INDEX game_admin_permissions_idx ON game_admin_permissions (game_id, user_id);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_game_admin_permissions()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY game_admin_permissions;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh the view when game_users changes
CREATE TRIGGER refresh_game_admin_permissions_trigger
AFTER INSERT OR UPDATE OR DELETE ON game_users
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_game_admin_permissions();

-- Create new policies using the materialized view
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

-- Game admin policies using materialized view
CREATE POLICY "Game admins can add users"
  ON game_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_admin_permissions gap
      WHERE gap.game_id = game_users.game_id
      AND gap.user_id = auth.uid()
    )
  );

CREATE POLICY "Game admins can modify users"
  ON game_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_admin_permissions gap
      WHERE gap.game_id = game_users.game_id
      AND gap.user_id = auth.uid()
    ) AND
    user_id != auth.uid() -- Prevent self-modification
  );

CREATE POLICY "Game admins can remove users"
  ON game_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_admin_permissions gap
      WHERE gap.game_id = game_users.game_id
      AND gap.user_id = auth.uid()
    ) AND
    user_id != auth.uid() -- Prevent self-deletion
  );

-- Do initial refresh of the materialized view
REFRESH MATERIALIZED VIEW game_admin_permissions;