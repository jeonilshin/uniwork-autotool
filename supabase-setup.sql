-- Run this SQL in your Supabase SQL Editor to set up the database

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  bought_from TEXT NOT NULL,
  sold_to TEXT NOT NULL,
  bought_price DECIMAL(10,2) NOT NULL,
  sold_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'bought' CHECK (status IN ('bought', 'delivered', 'received')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If table already exists, add status column
ALTER TABLE items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'bought' CHECK (status IN ('bought', 'delivered', 'received'));

-- Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all items" ON items;
DROP POLICY IF EXISTS "Users can insert items" ON items;
DROP POLICY IF EXISTS "Users can delete own items" ON items;
DROP POLICY IF EXISTS "Users can update own items" ON items;

-- Create policy to allow authenticated users to read all items
CREATE POLICY "Users can view all items" ON items
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert items
CREATE POLICY "Users can insert items" ON items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own items
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own items
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'item-images');

-- Allow public access to view images
CREATE POLICY "Public can view images" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'item-images');

-- Enable realtime for items table
ALTER PUBLICATION supabase_realtime ADD TABLE items;
