/*
  # Update Game-related Policies

  1. Changes
    - Add policies for game_users table to allow game admins to manage users
    - Add policies for events table to allow game admins to manage events
    - Add policies for modules table to allow proper access control

  2. Security
    - Ensures game admins can manage their game's users and events
    - Ensures writers can only manage their own modules
    - Maintains app admin access across all resources
*/

-- Drop existing game_users policies
DROP POLICY IF EXISTS "Anyone can view game roles" ON game_users;
DROP POLICY IF EXISTS "Game admins can insert users" ON game_users;
DROP POLICY IF EXISTS "Game admins can update users" ON game_users;
DROP POLICY IF EXISTS "Game admins can delete users" ON game_users;

-- Create new game_users policies
CREATE POLICY "Anyone can view game roles"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

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

CREATE POLICY "Game admins can manage their game users"
  ON game_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users
      WHERE game_id = game_users.game_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Drop existing events policies
DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Only game admins can modify events" ON events;

-- Create new events policies
CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "App admins can manage events"
  ON events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Game admins can manage their events"
  ON events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users
      WHERE game_id = events.game_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Drop existing modules policies
DROP POLICY IF EXISTS "Anyone can view modules" ON modules;
DROP POLICY IF EXISTS "Game admins can modify any module" ON modules;
DROP POLICY IF EXISTS "Writers can modify their own modules" ON modules;

-- Create new modules policies
CREATE POLICY "Anyone can view modules"
  ON modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "App admins can manage modules"
  ON modules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Game admins can manage all modules in their games"
  ON modules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users gu
      JOIN events e ON e.game_id = gu.game_id
      WHERE e.id = modules.event_id
      AND gu.user_id = auth.uid()
      AND gu.role = 'admin'
    )
  );

CREATE POLICY "Writers can manage their own modules"
  ON modules
  FOR ALL
  TO authenticated
  USING (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM game_users gu
      JOIN events e ON e.game_id = gu.game_id
      WHERE e.id = modules.event_id
      AND gu.user_id = auth.uid()
      AND gu.role = 'writer'
    )
  );