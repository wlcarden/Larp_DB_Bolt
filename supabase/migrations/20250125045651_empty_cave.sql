-- Drop all existing policies
DROP POLICY IF EXISTS "Public read access" ON game_users;
DROP POLICY IF EXISTS "App admins can manage game users" ON game_users;

-- Create a single policy that allows all operations for any authenticated user
CREATE POLICY "Allow all operations"
  ON game_users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);