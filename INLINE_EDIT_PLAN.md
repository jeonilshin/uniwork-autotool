# Inline Edit Implementation Plan

## Changes Required

### 1. Remove Features
- ❌ Statistics button and component
- ❌ Card view mode (keep list only)
- ❌ View mode toggle buttons
- ❌ D-Day column
- ❌ Delivery status (StatusProgressBar component)
- ❌ Image upload in Add Item form
- ❌ ItemDetailModal (click to view details)
- ❌ EditItemModal (separate edit form)

### 2. Keep Features
- ✅ List view only
- ✅ Row numbers
- ✅ Search and filters
- ✅ Add Item button (simplified form without image)
- ✅ Inquired suppliers expand/collapse
- ✅ Status badges (Remarks column)
- ✅ Delete functionality

### 3. Add Features
- ✨ Inline editing for all cells (Excel-like)
- ✨ Click cell to edit
- ✨ Auto-save on blur or Enter key
- ✨ Editable fields:
  - Qty
  - Unit
  - Particular
  - Cost
  - Discount
  - Freight
  - Supplier
  - Customer
  - Sales
  - Status (dropdown)

### 4. Table Structure (New)
```
# | Expand | Date | Qty | Unit | Particular | Cost | Discount | Freight | Supplier | Customer | Sales | Remarks
1 |   >    | ... | [edit] | [edit] | [edit] | [edit] | [edit] | [edit] | [edit] | [edit] | [edit] | [dropdown]
```

### 5. Implementation Steps

#### Step 1: Remove unused components and states
- Remove Statistics import
- Remove viewMode state
- Remove showEditModal, editingItem states
- Remove selectedItem modal trigger
- Add editingItemId and editingField states

#### Step 2: Remove card view rendering
- Keep only list view
- Remove all card view JSX

#### Step 3: Update table header
- Remove D-Day column
- Keep: #, Expand, Date, Qty, Unit, Particular, Cost, Discount, Freight, Supplier, Customer, Sales, Remarks

#### Step 4: Make table cells editable
- Add double-click or click handler to each editable cell
- Show input field when editing
- Save on blur or Enter
- Cancel on Escape

#### Step 5: Remove modals
- Remove ItemDetailModal component call
- Remove EditItemModal component call
- Remove Statistics component call

#### Step 6: Simplify Add Item form
- Remove image upload section
- Keep all other fields
- Simpler layout

### 6. Inline Edit Logic

```typescript
const [editingItemId, setEditingItemId] = useState<string | null>(null);
const [editingField, setEditingField] = useState<string | null>(null);
const [editValue, setEditValue] = useState<string>('');

const startEdit = (itemId: string, field: string, currentValue: any) => {
  setEditingItemId(itemId);
  setEditingField(field);
  setEditValue(String(currentValue));
};

const saveEdit = async () => {
  if (!editingItemId || !editingField) return;
  
  try {
    await updateItem(editingItemId, {
      [editingField]: editValue
    });
    // Refresh items
    fetchItems();
  } catch (error) {
    console.error('Failed to update:', error);
  }
  
  setEditingItemId(null);
  setEditingField(null);
};

const cancelEdit = () => {
  setEditingItemId(null);
  setEditingField(null);
};
```

### 7. Editable Cell Component

```tsx
const EditableCell = ({ itemId, field, value, type = 'text' }) => {
  const isEditing = editingItemId === itemId && editingField === field;
  
  if (isEditing) {
    return (
      <input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={saveEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') saveEdit();
          if (e.key === 'Escape') cancelEdit();
        }}
        autoFocus
        className="w-full px-2 py-1 border border-emerald-500 rounded focus:outline-none"
      />
    );
  }
  
  return (
    <div
      onClick={() => startEdit(itemId, field, value)}
      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
    >
      {value}
    </div>
  );
};
```

## Benefits

1. **Faster editing** - No modal popups
2. **Excel-like experience** - Familiar to users
3. **Cleaner UI** - Less clutter
4. **Better workflow** - Edit multiple items quickly
5. **Simpler code** - Less state management

## Migration Notes

- Users will need to adapt to inline editing instead of modal editing
- No more image uploads (can be added back later if needed)
- Statistics moved to separate view (removed for now)
- Focus on core inventory management
