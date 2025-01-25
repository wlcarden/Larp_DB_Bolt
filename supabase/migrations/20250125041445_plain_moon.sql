/*
  # Implement display names table

  1. New Tables
    - `user_display_names`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `game_id` (uuid, references games)
      - `display_name` (text)
      - `created_at` (timestamptz)

  2. Changes
    - Remove display_name from game_users table
    - Update get_user_metadata function to use new table
    - Add RLS policies for the new table

  3. Security
    - Enable RLS on user_display_names
    - Add policies for viewing and managing display names
*/

-- Remove display_name from game_users
ALTER TABLE game_users
DROP COLUMN IF EXISTS display_name;

-- Create user_display_names table
CREATE TABLE user_display_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game_id)
);

-- Enable RLS
ALTER TABLE user_display_names ENABLE ROW LEVEL SECURITY;

-- Create policies for user_display_names
CREATE POLICY "Anyone can view display names"
  ON user_display_names FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own display names"
  ON user_display_names
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Update get_user_metadata function to use new table
CREATE OR REPLACE FUNCTION get_user_metadata(user_ids uuid[])
RETURNS TABLE (id uuid, display_name text, email text)
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (u.id)
    u.id,
    COALESCE(
      udn.display_name,
      u.email::text
    ) as display_name,
    u.email::text
  FROM auth.users u
  LEFT JOIN user_display_names udn ON u.id = udn.user_id
  WHERE array_length(user_ids, 1) IS NULL OR u.id = ANY(user_ids)
  ORDER BY u.id, udn.created_at DESC;
END;
$$;