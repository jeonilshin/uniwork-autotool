# Bulk Delete Feature Guide

## Overview

You can now select multiple items and delete them all at once! This feature makes it easy to clean up your inventory by removing multiple items in a single action.

## How to Use

### Selecting Items

**Select individual items:**
1. Check the checkbox in the first column of any row
2. The item will be highlighted/selected
3. Repeat for as many items as you want to delete

**Select all items:**
1. Check the checkbox in the table header (first column)
2. All visible items will be selected
3. Check again to deselect all

### Deleting Selected Items

1. Select one or more items using the checkboxes
2. A red "Delete (X)" button will appear in the toolbar
   - X shows the number of selected items
3. Click the "Delete (X)" button
4. Confirm the deletion
5. All selected items will be deleted

### Deselecting Items

**Deselect individual items:**
- Uncheck the checkbox for that item

**Deselect all items:**
- Click the checkbox in the table header
- Or delete the selected items (clears selection automatically)

## Features

### Visual Indicators

- **Checkbox in header**: Select/deselect all items
- **Checkbox in each row**: Select/deselect individual items
- **Red Delete button**: Only appears when items are selected
- **Counter badge**: Shows number of selected items (e.g., "Delete (5)")

### Smart Behavior

- Selection persists while browsing
- Deleting items clears their selection
- Individual delete button still works for single items
- Bulk delete requires confirmation
- Failed deletions are reported

### Button Placement

The "Delete (X)" button appears:
- In the toolbar area
- Between "Reset Layout" and "Add Item" buttons
- Only when at least one item is selected
- Red color to indicate destructive action

## Example Workflows

### Clean up old items
1. Check items you want to remove
2. Click "Delete (5)" button
3. Confirm deletion
4. Items are removed

### Delete all filtered items
1. Apply filters to show specific items
2. Click "Select All" checkbox in header
3. Click "Delete (X)" button
4. Confirm deletion

### Selective deletion
1. Check specific items one by one
2. Review your selection
3. Click "Delete (X)" button
4. Confirm deletion

## Tips

1. **Use filters first**: Filter items before selecting to make bulk operations easier
2. **Check your selection**: Review selected items before deleting
3. **Confirmation required**: You'll always be asked to confirm bulk deletions
4. **No undo**: Deleted items cannot be recovered
5. **Individual delete still available**: Use the trash icon for single items

## Column Layout

The table now has:
1. **Checkbox column** (new) - Select items
2. **# column** - Row number
3. **Arrow/+ column** - Expand inquiries or add inquiry
4. **Data columns** - Your inventory data
5. **Delete column** - Individual delete button

## Safety Features

- **Confirmation dialog**: Always asks before deleting
- **Count display**: Shows exactly how many items will be deleted
- **Clear feedback**: Success/failure messages after deletion
- **Selection cleared**: After successful deletion, selection is reset

## Troubleshooting

### Delete button not appearing
- Make sure at least one item is selected
- Check that checkboxes are visible
- Try refreshing the page

### Can't select items
- Make sure you're clicking the checkbox, not the row
- Check if the table has loaded properly
- Try hard refresh (Ctrl+Shift+R)

### Some items not deleted
- Check browser console (F12) for error messages
- Verify you have permission to delete items
- Try deleting items individually to identify the problem

### Selection not working
- Make sure JavaScript is enabled
- Check for browser console errors
- Try clearing browser cache

## What Changed

### New Features:
- Checkbox column added (first column)
- Select all checkbox in header
- Individual item checkboxes in each row
- Bulk delete button (appears when items selected)
- Selection counter in delete button
- Confirmation dialog for bulk delete

### Visual Updates:
- Table has one additional column (checkbox)
- Red delete button appears dynamically
- Selected items remain highlighted
- Counter shows number of selected items
