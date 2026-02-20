-- Migration Script: Rename Fields
-- Run this in your Supabase SQL Editor

-- Step 1: Rename columns
ALTER TABLE items RENAME COLUMN description TO particular;
ALTER TABLE items RENAME COLUMN contact TO supplier_contact;
ALTER TABLE items RENAME COLUMN customer TO customer_name;

-- Step 2: Update inquired_list JSON structure
-- This updates the 'contact' field to 'supplier_contact' in the JSON array
UPDATE items 
SET inquired_list = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'supplier_name', elem->>'supplier_name',
      'supplier_contact', COALESCE(elem->>'contact', elem->>'supplier_contact', ''),
      'cost', (elem->>'cost')::numeric,
      'discount', elem->>'discount'
    )
  )
  FROM jsonb_array_elements(inquired_list) elem
)
WHERE inquired_list IS NOT NULL 
  AND inquired_list != 'null'::jsonb
  AND jsonb_array_length(inquired_list) > 0;

-- Step 3: Update indexes (drop old, create new)
DROP INDEX IF EXISTS idx_items_customer;
CREATE INDEX idx_items_customer_name ON items(customer_name);

-- Step 4: Verify the changes
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'items' 
  AND column_name IN ('particular', 'supplier_contact', 'customer_name')
ORDER BY ordinal_position;

-- Expected output:
-- particular | text
-- supplier_contact | text  
-- customer_name | text

-- Step 5: Check a sample record
SELECT 
  id,
  particular,
  supplier_name,
  supplier_contact,
  customer_name,
  customer_contact,
  inquired_list
FROM items 
LIMIT 1;
