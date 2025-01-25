/*
  # Add color column to modules table

  1. Changes
    - Add `color` column to `modules` table with default value 'blue'
    - Add check constraint to ensure only valid colors are used

  2. Notes
    - Uses enum type for color to ensure data integrity
    - Default color is 'blue' to maintain backwards compatibility
*/

-- Create enum type for module colors
CREATE TYPE module_color AS ENUM ('blue', 'green', 'purple', 'orange', 'pink', 'cyan');

-- Add color column to modules table
ALTER TABLE modules
ADD COLUMN color module_color NOT NULL DEFAULT 'blue';