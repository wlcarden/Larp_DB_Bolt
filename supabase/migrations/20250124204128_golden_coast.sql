/*
  # Add system admin role to admin user

  1. Changes
    - Sets the system_role to 'system_admin' for the admin user
*/

DO $$ 
BEGIN
  UPDATE auth.users 
  SET system_role = 'system_admin'
  WHERE email = 'admin@admin.com';
END $$;