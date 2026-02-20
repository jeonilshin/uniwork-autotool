# Database Schema Issue - Action Required

## The Problem
Supabase's schema cache doesn't know about recent column changes. You need to:

1. **Run the migration SQL** in your Supabase dashboard
2. **Refresh the schema cache**

## Step-by-Step Fix

### 1. Go to Supabase Dashboard
- Open https://supabase.com/dashboard
- Select your project
- Go to "SQL Editor"

### 2. Run This SQL (Copy & Paste):
```sql
-- Add the new columns if they don't exist
ALTER TABLE items ADD COLUMN IF NOT EXISTS part_number TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS remark TEXT;

-- Verify the particular column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'items' 
  AND column_name IN ('particular', 'part_number', 'remark', 'brand')
ORDER BY column_name;
```

### 3. Expected Output:
You should see:
- brand | text
- part_number | text
- particular | text
- remark | text

### 4. If 'particular' is Missing:
The column might be named 'description'. Run this:
```sql
-- Check what the actual column name is
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'items' 
  AND column_name LIKE '%descr%' OR column_name LIKE '%part%';

-- If it's 'description', rename it:
ALTER TABLE items RENAME COLUMN description TO particular;
```

### 5. Refresh Your App
After running the SQL:
1. Hard refresh browser: `Cmd+Shift+R` or `Ctrl+Shift+R`
2. Try editing the Description field again

## Alternative: Check Current Schema
Run this to see ALL columns:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'items'
ORDER BY ordinal_position;
```

This will show you exactly what columns exist in your database.
