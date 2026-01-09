-- Uniwork Inventory Management System - Database Setup
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table for role management
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'secretary' CHECK (role IN ('admin', 'secretary')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create items table with new structure
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT,
  brand TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  vat_type TEXT NOT NULL DEFAULT 'non_vat' CHECK (vat_type IN ('vat_inclusive', 'non_vat')),
  discount TEXT,
  sale DECIMAL(12,2) NOT NULL,
  supplier_name TEXT NOT NULL,
  contact TEXT,
  customer TEXT NOT NULL,
  customer_contact TEXT,
  freight_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  freight_type TEXT NOT NULL DEFAULT 'sea' CHECK (freight_type IN ('sea', 'land', 'air')),
  status TEXT NOT NULL DEFAULT 'inquired' CHECK (status IN ('inquired', 'bought', 'arrived', 'delivered')),
  is_inquired BOOLEAN DEFAULT FALSE,
  inquired_list JSONB,
  delivered_at TIMESTAMP WITH TIME ZONE,
  payment_collected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- If you already have the items table and need to add customer_contact column, run this:
-- ALTER TABLE items ADD COLUMN IF NOT EXISTS customer_contact TEXT;

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() = created_by);
CREATE POLICY "Admins can delete secretaries" ON user_profiles FOR DELETE USING (auth.uid() = created_by);

-- Items policies - all authenticated users can CRUD
CREATE POLICY "Authenticated users can view items" ON items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert items" ON items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update items" ON items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete items" ON items FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_brand ON items(brand);
CREATE INDEX idx_items_customer ON items(customer);
CREATE INDEX idx_items_supplier ON items(supplier_name);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_items_is_inquired ON items(is_inquired);

-- Storage bucket for item images (run in Supabase Dashboard > Storage)
-- 1. Create a new bucket called "item-images"
-- 2. Make it public
-- 3. Add policy: Allow authenticated users to upload

-- Sample inquired_list JSON structure:
-- [
--   {
--     "supplier_name": "Supplier A",
--     "contact": "09123456789",
--     "cost": 1000.00,
--     "discount": 50.00,
--     "sale": 1200.00
--   },
--   {
--     "supplier_name": "Supplier B", 
--     "contact": "09987654321",
--     "cost": 1100.00,
--     "discount": null,
--     "sale": 1300.00
--   }
-- ]
