-- Add part_number and remark columns to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS part_number TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS remark TEXT;

-- Update existing rows to have empty values
UPDATE items SET part_number = '' WHERE part_number IS NULL;
UPDATE items SET remark = '' WHERE remark IS NULL;
