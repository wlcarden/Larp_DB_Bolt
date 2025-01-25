-- Create a function to safely get user metadata
CREATE OR REPLACE FUNCTION get_user_metadata(user_ids uuid[])
RETURNS TABLE (id uuid, display_name text, email text)
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(
      (u.raw_user_meta_data->>'display_name')::text,
      u.email::text
    ) as display_name,
    u.email::text
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;