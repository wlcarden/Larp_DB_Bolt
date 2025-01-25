/*
  # Add display name to game users

  1. Changes
    - Add display_name column to game_users table
    - Update get_user_metadata function to use game_users display_name
*/

-- Add display_name column to game_users
ALTER TABLE game_users
ADD COLUMN display_name text NOT NULL;

-- Update get_user_metadata function to use game_users display_name
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
      gu.display_name,
      u.email::text
    ) as display_name,
    u.email::text
  FROM auth.users u
  LEFT JOIN game_users gu ON u.id = gu.user_id
  WHERE array_length(user_ids, 1) IS NULL OR u.id = ANY(user_ids);
END;
$$;