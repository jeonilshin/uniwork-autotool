# Migration Guide: Dark to Light Mode & Field Renaming

## Changes Made

### 1. Database Schema (supabase-setup.sql)
- ✅ Renamed `description` → `particular`
- ✅ Renamed `contact` → `supplier_contact`  
- ✅ Renamed `customer` → `customer_name`
- ✅ Reordered fields to match specification:
  - image (optional)
  - qty
  - unit
  - particular
  - cost
  - discount
  - vat
  - supplier_name
  - supplier_contact
  - customer_name
  - customer_contact
  - sale
  - freight_cost
  - freight_type

### 2. TypeScript Interfaces (src/lib/supabase.ts)
- ✅ Updated `InventoryItem` interface with new field names
- ✅ Updated `InquiredSupplier` interface (`contact` → `supplier_contact`)
- ✅ Updated search query to use new field names

### 3. Styling (src/app/globals.css)
- ✅ Changed from dark mode (#0f172a) to light mode (#ffffff)
- ✅ Changed font to Calibri (Excel-like)
- ✅ Updated select dropdown styling for light mode

## Required Manual Steps

### Step 1: Run Database Migration
Execute in Supabase SQL Editor:

```sql
-- Rename columns
ALTER TABLE items RENAME COLUMN description TO particular;
ALTER TABLE items RENAME COLUMN contact TO supplier_contact;
ALTER TABLE items RENAME COLUMN customer TO customer_name;

-- Update inquired_list JSON structure (if needed)
-- This updates the JSON field names in existing records
UPDATE items 
SET inquired_list = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'supplier_name', elem->>'supplier_name',
      'supplier_contact', elem->>'contact',
      'cost', elem->>'cost',
      'discount', elem->>'discount'
    )
  )
  FROM jsonb_array_elements(inquired_list) elem
)
WHERE inquired_list IS NOT NULL;
```

### Step 2: Update Dashboard Component

The Dashboard.tsx file needs comprehensive updates. Key changes:

#### Color Scheme Changes (Dark → Light):
- `bg-slate-900` → `bg-white` or `bg-gray-50`
- `bg-slate-800` → `bg-white` with `border-gray-200`
- `text-white` → `text-gray-900`
- `text-slate-400` → `text-gray-600`
- `border-white/10` → `border-gray-200`
- `bg-white/5` → `bg-gray-50` or `bg-white`
- `hover:bg-white/10` → `hover:bg-gray-100`

#### Excel-Style Table Styling:
```css
/* Apply these classes to the table */
- Border: `border border-gray-300`
- Header: `bg-gray-100 border-b-2 border-gray-400`
- Rows: `border-b border-gray-200 hover:bg-blue-50`
- Alternating rows: `even:bg-gray-50`
- Cells: `px-3 py-2 text-sm border-r border-gray-200`
```

#### Field Name Updates in Dashboard.tsx:
Replace all occurrences:
- `item.description` → `item.particular`
- `item.contact` → `item.supplier_contact`
- `item.customer` → `item.customer_name`
- `formData.description` → `formData.particular`
- `formData.contact` → `formData.supplier_contact`
- `formData.customer` → `formData.customer_name`

### Step 3: Excel-Style Design Principles

Apply these design patterns throughout:

1. **Typography**: Use Calibri font (already set in globals.css)
2. **Borders**: Thin gray borders (`border-gray-300`)
3. **Headers**: Light gray background (`bg-gray-100`)
4. **Alternating Rows**: Zebra striping with `even:bg-gray-50`
5. **Hover States**: Light blue highlight (`hover:bg-blue-50`)
6. **Input Fields**: White background with gray border
7. **Buttons**: 
   - Primary: `bg-blue-600 hover:bg-blue-700 text-white`
   - Secondary: `bg-gray-200 hover:bg-gray-300 text-gray-900`
8. **Status Badges**: Light backgrounds with colored text and borders
9. **Spacing**: Compact padding (px-2 py-1 for cells)

## Testing Checklist

- [ ] Database migration completed successfully
- [ ] All items display with correct field names
- [ ] Search functionality works with new field names
- [ ] Add item form uses new field names
- [ ] Edit item form uses new field names
- [ ] Inquired suppliers list displays correctly
- [ ] Light mode styling applied throughout
- [ ] Excel-like table appearance achieved
- [ ] All buttons and interactions work
- [ ] Responsive design maintained

## Rollback Plan

If issues occur, run:

```sql
ALTER TABLE items RENAME COLUMN particular TO description;
ALTER TABLE items RENAME COLUMN supplier_contact TO contact;
ALTER TABLE items RENAME COLUMN customer_name TO customer;
```

Then revert code changes via git.
