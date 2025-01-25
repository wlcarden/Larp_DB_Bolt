/*
  # Add Application Admins table

  1. New Tables
    - `app_admins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `app_admins` table
    - Add policy for authenticated users to read app_admins
    - Add policy for app admins to manage app_admins
*/

-- Create app_admins table
CREATE TABLE app_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view app admins"
  ON app_admins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "App admins can manage app admins"
  ON app_admins
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );

-- Insert initial admin
INSERT INTO app_admins (user_id)
SELECT id FROM auth.users
WHERE email = 'admin@admin.com';