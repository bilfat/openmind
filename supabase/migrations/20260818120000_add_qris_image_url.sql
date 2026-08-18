-- Migration: Add qris_image_url column to events table
-- Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor)

-- Step 1: Add the column
ALTER TABLE events ADD COLUMN IF NOT EXISTS qris_image_url TEXT;

-- Step 2: Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'qris_image_url';
