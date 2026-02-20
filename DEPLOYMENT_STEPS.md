# Deployment Steps

## Overview
This guide walks you through deploying the changes from dark mode to light mode with Excel-style design and field renaming.

## Prerequisites
- Access to Supabase SQL Editor
- Node.js and npm installed
- Git repository access

## Step-by-Step Instructions

### Step 1: Backup Current Database
```sql
-- In Supabase SQL Editor, create a backup
CREATE TABLE items_backup AS SELECT * FROM items;
CREATE TABLE user_profiles_backup AS SELECT * FROM user_profiles;
```

### Step 2: Run Database Migration
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `migration.sql`
4. Click "Run" to execute
5. Verify the output shows the renamed columns

### Step 3: Verify Database Changes
```sql
-- Check column names
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'items' 
ORDER BY ordinal_position;

-- Should see: particular, supplier_contact, customer_name (not description, contact, customer)

-- Check sample data
SELECT particular, supplier_name, supplier_contact, customer_name 
FROM items LIMIT 5;
```

### Step 4: Deploy Code Changes
```bash
# Pull latest changes (if using git)
git pull origin main

# Install dependencies (if needed)
npm install

# Build the application
npm run build

# Start development server to test
npm run dev
```

### Step 5: Test the Application
Open http://localhost:3000 and verify:

#### Visual Checks
- [ ] Light mode styling (white background, dark text)
- [ ] Excel-like table with thin gray borders
- [ ] Alternating row colors (zebra striping)
- [ ] Header row has light gray background
- [ ] Hover effects work (light blue highlight)
- [ ] Status badges have light backgrounds with borders

#### Functional Checks
- [ ] Login works
- [ ] Dashboard loads with items
- [ ] Table displays all columns correctly:
  - Date, Qty, Unit, Particular, Cost, Discount, Freight, Supplier, Customer, Sales, Remarks, D-Day
- [ ] Search works (try searching by particular, supplier, customer)
- [ ] Add Item form works
  - All fields labeled correctly
  - Particular field (not Description)
  - Supplier Contact field
  - Customer Name field
- [ ] Edit Item form works
- [ ] Inquired suppliers display correctly
- [ ] Status changes work
- [ ] Payment collection works
- [ ] Notifications work

### Step 6: Clear Browser Cache
If you see old styling:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
OR
4. Use Incognito/Private mode

### Step 7: Production Deployment
```bash
# Build for production
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, etc.)
```

## Rollback Plan

If something goes wrong:

### Rollback Database
```sql
-- Restore from backup
DROP TABLE items;
ALTER TABLE items_backup RENAME TO items;

DROP TABLE user_profiles;
ALTER TABLE user_profiles_backup RENAME TO user_profiles;
```

### Rollback Code
```bash
# Restore original Dashboard
cp src/components/Dashboard.tsx.original src/components/Dashboard.tsx

# Revert other files via git
git checkout src/lib/supabase.ts
git checkout src/app/globals.css
git checkout supabase-setup.sql
```

## Troubleshooting

### Issue: "Column does not exist" errors
**Solution**: Database migration not run. Execute `migration.sql` in Supabase.

### Issue: Old dark mode styling still showing
**Solution**: Clear browser cache or use incognito mode.

### Issue: TypeScript compilation errors
**Solution**: 
```bash
rm -rf .next
npm run build
```

### Issue: Search not working
**Solution**: Check that database columns are renamed correctly:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'items';
```

### Issue: Inquired suppliers not displaying
**Solution**: Check inquired_list JSON structure:
```sql
SELECT inquired_list FROM items WHERE is_inquired = true LIMIT 1;
```
Should have `supplier_contact` field, not `contact`.

## Field Mapping Reference

| Old Field Name | New Field Name | Location |
|---------------|----------------|----------|
| description | particular | items table |
| contact | supplier_contact | items table |
| customer | customer_name | items table |
| contact | supplier_contact | inquired_list JSON |

## Color Reference

### Status Colors (Light Mode)
- **Inquired**: Blue - `bg-blue-100 text-blue-700 border-blue-300`
- **Bought**: Red - `bg-red-100 text-red-700 border-red-300`
- **Arrived**: Yellow - `bg-yellow-100 text-yellow-700 border-yellow-300`
- **Delivered**: Green - `bg-green-100 text-green-700 border-green-300`

### Table Colors
- **Background**: White `#ffffff`
- **Alternate rows**: Light gray `bg-gray-50`
- **Header**: Light gray `bg-gray-100`
- **Borders**: Gray `border-gray-200` and `border-gray-300`
- **Hover**: Light blue `hover:bg-blue-50`

## Support

If you encounter issues:
1. Check the console for errors (F12 → Console tab)
2. Check Supabase logs
3. Verify database migration completed successfully
4. Review `CHANGES_SUMMARY.md` for detailed changes

## Success Criteria

✅ Database columns renamed
✅ Application compiles without errors
✅ Light mode styling throughout
✅ Excel-like table appearance
✅ All CRUD operations work
✅ Search functionality works
✅ No console errors
✅ Responsive design maintained
