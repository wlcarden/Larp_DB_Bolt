/*
  # Update Games Table Policies

  1. Changes
    - Drop existing games policies
    - Add new policies for app admins to manage games
    - Keep existing policy for authenticated users to view games

  2. Security
    - App admins can perform all operations on games
    - All authenticated users can view games
*/

-- Drop existing games policies
DROP POLICY IF EXISTS "Anyone can view games" ON games;
DROP POLICY IF EXISTS "Only game admins can modify their games" ON games;

-- Create new policies
CREATE POLICY "Anyone can view games"
  ON games FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "App admins can manage games"
  ON games
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Game admins can manage their games"
  ON games
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users
      WHERE game_id = games.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );