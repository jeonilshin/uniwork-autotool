-- Run this SQL in your Supabase SQL Editor to set up the database

-- Create user_profiles table for role management
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'secretary' CHECK (role IN ('admin', 'secretary')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  contact TEXT DEFAULT '',
  bought_from TEXT NOT NULL,
  purchaser TEXT NOT NULL,
  bought_price DECIMAL(10,2) NOT NULL,
  sold_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'bought' CHECK (status IN ('bought', 'arrived', 'delivered')),
  freight_type TEXT DEFAULT 'sea' CHECK (freight_type IN ('sea', 'land', 'air')),
  vat_type TEXT DEFAULT 'vat_inclusive' CHECK (vat_type IN ('vat_inclusive', 'non_vat')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  contact TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns if tables already exist
ALTER TABLE items ADD COLUMN IF NOT EXISTS contact TEXT DEFAULT '';
ALTER TABLE items ADD COLUMN IF NOT EXISTS freight_type TEXT DEFAULT 'sea';
ALTER TABLE items ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'vat_inclusive';
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_inquired BOOLEAN DEFAULT false;

-- Rename sold_to to purchaser if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'sold_to') THEN
    ALTER TABLE items RENAME COLUMN sold_to TO purchaser;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view secretaries" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete secretaries" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert secretary profiles" ON user_profiles;

DROP POLICY IF EXISTS "Users can view all items" ON items;
DROP POLICY IF EXISTS "Users can insert items" ON items;
DROP POLICY IF EXISTS "Users can delete own items" ON items;
DROP POLICY IF EXISTS "Users can update items" ON items;

DROP POLICY IF EXISTS "Users can view all inquiries" ON inquiries;
DROP POLICY IF EXISTS "Users can insert inquiries" ON inquiries;
DROP POLICY IF EXISTS "Users can delete inquiries" ON inquiries;

-- User profiles policies
-- Users can view their own profile OR profiles they created (for admins viewing secretaries)
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id OR created_by = auth.uid());
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can delete secretaries" ON user_profiles FOR DELETE TO authenticated USING (created_by = auth.uid());
-- Allow admins to insert profiles for secretaries they create
CREATE POLICY "Admins can insert secretary profiles" ON user_profiles FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Items policies
CREATE POLICY "Users can view all items" ON items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert items" ON items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update items" ON items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can delete items" ON items FOR DELETE TO authenticated USING (true);

-- Inquiries policies
CREATE POLICY "Users can view all inquiries" ON inquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert inquiries" ON inquiries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete inquiries" ON inquiries FOR DELETE TO authenticated USING (true);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;

CREATE POLICY "Users can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'item-images');
CREATE POLICY "Public can view images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'item-images');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE inquiries;
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
