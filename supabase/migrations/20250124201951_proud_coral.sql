/*
  # Initial Schema Setup for Game Management System

  1. New Tables
    - `systems`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `authors` (text)
      - `url` (text)
      - `created_at` (timestamp)

    - `games`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `system_id` (uuid, foreign key)
      - `module_properties` (jsonb)
      - `created_at` (timestamp)

    - `game_users`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `role` (text) - 'admin' or 'writer'
      - `created_at` (timestamp)

    - `events`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key)
      - `name` (text)
      - `description` (text)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `created_at` (timestamp)

    - `modules`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key)
      - `author_id` (uuid, foreign key)
      - `name` (text)
      - `summary` (text)
      - `start_time` (timestamp)
      - `duration` (numeric)
      - `properties` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on their roles
*/

-- Create systems table
CREATE TABLE systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  authors text,
  url text,
  created_at timestamptz DEFAULT now()
);

-- Create games table
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  system_id uuid REFERENCES systems(id) ON DELETE CASCADE,
  module_properties jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create game_users junction table
CREATE TABLE game_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'writer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Create events table
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_event_times CHECK (end_time > start_time)
);

-- Create modules table
CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  summary text,
  start_time timestamptz NOT NULL,
  duration numeric NOT NULL CHECK (duration > 0),
  properties jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Systems policies
CREATE POLICY "Anyone can view systems"
  ON systems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only game admins can modify systems"
  ON systems
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_users
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Games policies
CREATE POLICY "Anyone can view games"
  ON games FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only game admins can modify their games"
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

-- Game users policies
CREATE POLICY "Users can view game roles"
  ON game_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only game admins can modify game users"
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

-- Events policies
CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only game admins can modify events"
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

-- Modules policies
CREATE POLICY "Anyone can view modules"
  ON modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Game admins can modify any module"
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

CREATE POLICY "Writers can modify their own modules"
  ON modules
  FOR ALL
  TO authenticated
  USING (
    (author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM game_users gu
      JOIN events e ON e.game_id = gu.game_id
      WHERE e.id = modules.event_id
      AND gu.user_id = auth.uid()
      AND gu.role = 'writer'
    ))
  );