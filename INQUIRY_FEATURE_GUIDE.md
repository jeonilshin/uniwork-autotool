# Inquiry Management Feature Guide

## Overview

You can now manage inquiries for each inventory item! This feature allows you to track multiple supplier quotes for the same item, compare prices, and keep all inquiry information organized.

## How to Use

### Adding Inquiries

**For items WITHOUT inquiries:**
1. Look for the blue **+** button in the second column (next to the row number)
2. Click the **+** button to open the Inquiry Management modal
3. Click "Add Inquiry" to create a new inquiry entry
4. Fill in the supplier details:
   - Supplier Name
   - Supplier Contact
   - Cost
   - Discount (optional)
5. Click the green checkmark to save
6. Add more inquiries as needed

**For items WITH existing inquiries:**
1. Click the arrow button in the second column to expand the inquired rows
2. Click anywhere on the blue/cyan inquired row to open the Inquiry Management modal
3. View, edit, add, or delete inquiries

### Viewing Inquiries

**In the table:**
- Items with inquiries show an arrow button (▶) in the second column
- Click the arrow to expand and see all inquired suppliers
- Inquired rows are shown in light blue/cyan background
- Each row shows: Inquired #, Cost, Discount, and Supplier name

**In the modal:**
- Shows complete original item information at the top
- Lists all inquired suppliers below
- Each inquiry card shows all details

### Editing Inquiries

1. Open the Inquiry Management modal (click + button or inquired row)
2. Find the inquiry you want to edit
3. Click the blue edit icon (pencil)
4. Modify the fields:
   - Supplier Name
   - Supplier Contact
   - Cost
   - Discount
5. Click the green checkmark to save
6. Click the X to cancel

### Deleting Inquiries

1. Open the Inquiry Management modal
2. Find the inquiry you want to delete
3. Click the red delete icon (trash)
4. Confirm the deletion
5. The inquiry will be removed

**Note:** If you delete all inquiries, the item will no longer be marked as "inquired" and the arrow button will change back to a + button.

## Features

### Visual Indicators

- **Blue + button**: Item has no inquiries yet
- **Arrow button**: Item has inquiries (click to expand/collapse)
- **Cyan/blue rows**: Inquired supplier entries
- **Hover effect**: Inquired rows highlight on hover (clickable)

### Inquiry Modal

**Original Item Section:**
- Shows all details of the main item
- Includes: Brand, Part Number, Description, Unit, Cost, Discount, Supplier, Sale, Customer, Qty, Remark
- Gray background for easy distinction

**Inquired Suppliers Section:**
- List of all supplier inquiries
- Each inquiry card shows:
  - Inquiry number (#1, #2, etc.)
  - Supplier name and contact
  - Cost and discount
  - Edit and delete buttons
- Add new inquiries with "Add Inquiry" button

### Inquiry Card Actions

Each inquiry card has:
- **Edit button** (blue pencil icon): Edit the inquiry details
- **Delete button** (red trash icon): Remove the inquiry
- **Save button** (green checkmark): Save changes when editing
- **Cancel button** (gray X): Cancel editing

## Data Structure

Each inquiry contains:
- **supplier_name**: Name of the supplier
- **supplier_contact**: Contact information
- **cost**: Quoted price from this supplier
- **discount**: Discount offered (can be "5" or "5/10" format)

## Tips

1. **Compare prices easily**: Open the modal to see all supplier quotes side by side
2. **Track contacts**: Store supplier contact information for easy follow-up
3. **Multiple discounts**: Use format like "5/10" for tiered discounts
4. **Quick access**: Click any blue inquired row to open the modal
5. **Expand/collapse**: Use the arrow button to show/hide inquired rows in the table

## Example Workflow

1. **New item arrives**: Click the blue + button
2. **Add first inquiry**: Click "Add Inquiry", enter Supplier A details
3. **Add more inquiries**: Click "Add Inquiry" again for Supplier B, C, etc.
4. **Compare prices**: View all inquiries in the modal
5. **Choose best supplier**: Edit the main item to use the selected supplier's details
6. **Keep records**: Inquiries remain for future reference

## What Changed

### New Features:
- Blue + button for items without inquiries
- Clickable inquired rows (cyan background)
- Comprehensive Inquiry Management modal
- Add, edit, and delete inquiries
- View original item and all inquiries together
- Inline editing for inquiry details

### Visual Updates:
- Inquired rows now have hover effect
- + button appears for non-inquired items
- Modal shows complete item information
- Color-coded inquiry cards (cyan theme)

## Troubleshooting

### + button not appearing
- Make sure the item doesn't already have inquiries
- Check if the item is expanded (arrow button means it has inquiries)

### Can't edit inquiry
- Click the blue pencil icon first
- Make your changes
- Click the green checkmark to save

### Changes not saving
- Make sure you clicked the save button (green checkmark)
- Check browser console (F12) for error messages
- Verify you have permission to edit items

### Modal not opening
- Try clicking directly on the blue inquired row
- Make sure the row is expanded first
- Check if another modal is already open
