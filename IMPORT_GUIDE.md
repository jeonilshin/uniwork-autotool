# Import Feature Guide

## Overview

You can now import inventory items from CSV or Excel files! The import feature automatically maps columns, shows a preview table for review, and adds items to your database sorted by date.

## How to Use

1. Click the purple "Import" button next to the tabs
2. Select your CSV or Excel file (.csv, .xlsx, .xls)
3. Click "Preview" to parse the file and see the data
4. Review the preview table showing all items to be imported
5. Click "Confirm Import" to add the items to your database
6. Items will be added and sorted by date automatically

## CSV Format Requirements

### Supported Column Names (case-insensitive)

The import feature recognizes these column names:

- **Date** → created_at (supports various formats - see Date Format section below)
- **Brand** → brand
- **Part Number** / **Part_Number** → part_number
- **Description** / **Particular** → particular (description field)
- **Cost** → cost
- **Unit** → unit
- **Discount** / **Discount %** → discount
- **Supplier** / **Supplier_Name** → supplier_name
- **Sale** → sale
- **Customer** / **Customer_Name** → customer_name
- **Qty** / **Quantity** → qty
- **Remark** / **Remarks** → remark

### Date Format Support

The import feature intelligently handles hierarchical date structures commonly found in CSV files:

**How it works:**
- Date markers set the context for all following data rows
- Context persists until a new date marker is encountered
- Empty rows with only date markers are automatically skipped

**Supported date markers:**

1. **Year markers**: "2023" 
   - Sets year context for all following rows
   - Must be in a row with no other data

2. **Month markers**: "April", "March", "Apr", "Mar", "Apr-23"
   - Sets month context for all following rows
   - Can include year (e.g., "Apr-23" = April 2023)
   - Must be in a row with no other data

3. **Day markers**: "13", "28", "1", "31"
   - Sets day context for all following rows
   - Uses current year/month context
   - Can be in a row with data OR in a separate row

**Example CSV structure:**
```csv
Date,Brand,Part Number,Description,Cost,Unit,Discount,Supplier,Sale,Customer,Qty,Remark
2023,,,,,,,,,,,
April,,,,,,,,,,,
13,Toyota,ABC123,Engine Oil Filter,500,pcs,5,ABC Supplies,650,John's Auto,10,Urgent
,Honda,XYZ789,Air Filter,300,pcs,,XYZ Parts,400,Mike's Garage,5,
28,Mazda,DEF456,Brake Pads,800,set,,DEF Parts,1000,Tom's Shop,2,
March,,,,,,,,,,,
15,Ford,GHI789,Oil Filter,450,pcs,,GHI Supplies,600,Jane's Auto,8,
```

**How dates are assigned:**
- Row with "2023" → Sets year to 2023
- Row with "April" → Sets month to April 2023
- Row with "13" + Toyota data → April 13, 2023
- Row with Honda data (no date) → April 13, 2023 (uses previous day)
- Row with "28" + Mazda data → April 28, 2023
- Row with "March" → Sets month to March 2023
- Row with "15" + Ford data → March 15, 2023

**Special cases:**
- "Apr-23" → Automatically detects as April 2023
- "May-24" → Automatically detects as May 2024
- Rows with only date markers are skipped (not imported as items)
- Rows with no date use the last known date context

### Example CSV Format

```csv
Date,Brand,Part Number,Description,Cost,Unit,Discount,Supplier,Sale,Customer,Qty,Remark
2024-01-15,Toyota,ABC123,Engine Oil Filter,500,pcs,5,ABC Supplies,650,John's Auto,10,Urgent order
2024-01-16,Honda,XYZ789,Air Filter,300,pcs,,XYZ Parts,400,Mike's Garage,5,
```

### Important Notes

1. **First row must be headers** - Column names in the first row
2. **Preview before import** - Review all data in a table before confirming
3. **Date context is hierarchical** - Year → Month → Day, each level persists until changed
4. **Date markers can be standalone** - Rows with only date markers (no data) are skipped
5. **Date context persists** - If a row has no date, it uses the last known date context
6. **Empty rows are skipped** - Rows without brand, description, cost, or sale are automatically skipped
7. **Missing columns use defaults** - If a column is missing, default values are used:
   - Unit: "-"
   - Description: "-"
   - Supplier: "-"
   - Customer: "-"
   - Qty: 1
   - Cost/Sale: 0
8. **Currency symbols are removed** - ₱, commas, and spaces are automatically stripped from numbers
9. **Items are sorted by date** - After import, all items (existing + new) are sorted by date (newest first)

## Default Values for Missing Fields

Fields not in your CSV will use these defaults:
- image_url: null
- vat_type: 'non_vat'
- supplier_contact: ''
- customer_contact: null
- freight_cost: 0
- freight_type: 'sea'
- status: 'inquired'
- is_inquired: false
- inquired_list: null
- delivered_at: null
- payment_collected: false

## Tips

1. **Use the preview feature** - Always review the preview table before confirming import
2. **Check column names** - Make sure your headers match the supported names
3. **Date format flexibility** - The system handles various date formats, including year/month markers
4. **Review preview carefully** - Check that dates are parsed correctly in the preview
5. **Edit after import if needed** - You can still edit items after importing
6. **Backup your data** - Export your current data before large imports

## Troubleshooting

### "File is empty or has no data rows"
- Make sure your CSV has at least 2 rows (header + 1 data row)
- Check for empty lines at the end of the file

### "Failed to parse file"
- Verify the file is a valid CSV or Excel file
- Check that column names match the supported names
- Look for special characters or formatting issues

### Preview shows wrong dates
- Check that year/month markers are in the correct order
- Verify day numbers are valid (1-31)
- Make sure date context rows come before data rows

### Preview shows no items
- Check if all rows are being treated as context rows (year/month markers)
- Verify that data rows have at least brand, description, or cost filled in
- Empty rows are automatically skipped

### Some rows failed to import (after confirmation)
- Check the browser console (F12) for specific error messages
- Verify data types (numbers for cost/sale/qty, text for others)
- Check for missing required data

### Items not sorted correctly
- Dates are parsed based on context from year/month markers
- Review the preview table to verify dates before confirming
- You can manually edit dates after import if needed

## Example Excel/CSV Template

You can create a template with these columns:

| Date | Brand | Part Number | Description | Cost | Unit | Discount | Supplier | Sale | Customer | Qty | Remark |
|------|-------|-------------|-------------|------|------|----------|----------|------|----------|-----|--------|
| 2024-01-15 | Toyota | ABC123 | Engine Oil Filter | 500 | pcs | 5 | ABC Supplies | 650 | John's Auto | 10 | Urgent |

Save as CSV and import!

## What Changed

### Latest Update - Improved Date Context Parsing:
1. **Hierarchical date context** - Year → Month → Day structure with persistent context
2. **Date context persists** - Rows without dates automatically use the last known date
3. **Standalone date markers** - Rows with only date markers (no data) are properly skipped
4. **Better month-year detection** - Handles "Apr-23", "May-24" format automatically
5. **Smarter empty row detection** - Skips rows without brand, description, cost, OR sale
6. **Improved number parsing** - Removes spaces from numbers (e.g., "4,700.00 " → 4700)

### Previous Update - Import Preview:
- Preview before import with table view
- Smart date parsing for year/month/day markers
- Context-aware parsing
- Two-step process: Preview → Confirm Import
- Better error handling

### Original Features:
- CSV/Excel file import
- Automatic column mapping
- Automatic date sorting after import
- Import progress indicator
- Success/failure count after import
