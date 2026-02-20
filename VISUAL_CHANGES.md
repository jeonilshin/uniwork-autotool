# Visual Changes: Dark Mode → Light Mode (Excel Style)

## Color Transformation

### Background Colors
| Element | Before (Dark) | After (Light) |
|---------|--------------|---------------|
| Page background | `bg-slate-900` (#0f172a) | `bg-gray-50` (#f9fafb) |
| Card/Modal background | `bg-slate-800` (#1e293b) | `bg-white` (#ffffff) |
| Table background | `bg-slate-800` | `bg-white` |
| Header background | `bg-slate-900` | `bg-white` with shadow |
| Input background | `bg-white/5` (dark transparent) | `bg-gray-50` |
| Hover state | `hover:bg-white/10` | `hover:bg-blue-50` |

### Text Colors
| Element | Before (Dark) | After (Light) |
|---------|--------------|---------------|
| Primary text | `text-white` (#ffffff) | `text-gray-900` (#111827) |
| Secondary text | `text-slate-400` (#94a3b8) | `text-gray-600` (#4b5563) |
| Tertiary text | `text-slate-500` (#64748b) | `text-gray-500` (#6b7280) |
| Label text | `text-slate-300` (#cbd5e1) | `text-gray-700` (#374151) |

### Border Colors
| Element | Before (Dark) | After (Light) |
|---------|--------------|---------------|
| Primary borders | `border-white/10` | `border-gray-200` (#e5e7eb) |
| Secondary borders | `border-white/5` | `border-gray-100` (#f3f4f6) |
| Strong borders | `border-white/20` | `border-gray-300` (#d1d5db) |
| Table header border | `border-white/10` | `border-gray-400` (2px) |

## Excel-Style Table Design

### Before (Dark Mode)
```
┌─────────────────────────────────────────┐
│ Dark background (#1e293b)               │
│ Rounded corners (rounded-2xl)           │
│ Backdrop blur effect                    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Header (bg-white/5)                 │ │
│ │ Light text, medium padding          │ │
│ ├─────────────────────────────────────┤ │
│ │ Row 1 (hover: bg-white/5)           │ │
│ │ Subtle borders                      │ │
│ ├─────────────────────────────────────┤ │
│ │ Row 2                               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### After (Light Mode - Excel Style)
```
┌─────────────────────────────────────────┐
│ White background (#ffffff)              │
│ Sharp corners (no rounding)             │
│ Thin gray border (border-gray-300)      │
│                                         │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┐ │
│ │ Hdr │ Hdr │ Hdr │ Hdr │ Hdr │ Hdr │ │ ← bg-gray-100
│ │     │     │     │     │     │     │ │   border-b-2
│ ├─────┼─────┼─────┼─────┼─────┼─────┤ │
│ │ R1  │ R1  │ R1  │ R1  │ R1  │ R1  │ │ ← bg-white
│ ├─────┼─────┼─────┼─────┼─────┼─────┤ │
│ │ R2  │ R2  │ R2  │ R2  │ R2  │ R2  │ │ ← bg-gray-50
│ ├─────┼─────┼─────┼─────┼─────┼─────┤ │
│ │ R3  │ R3  │ R3  │ R3  │ R3  │ R3  │ │ ← bg-white
│ └─────┴─────┴─────┴─────┴─────┴─────┘ │
└─────────────────────────────────────────┘
```

Key differences:
- ✅ Visible cell borders (border-r border-gray-200)
- ✅ Alternating row colors (even:bg-gray-50)
- ✅ Thicker header border (border-b-2 border-gray-400)
- ✅ Compact padding (p-2 instead of p-3)
- ✅ Light blue hover (hover:bg-blue-50)

## Status Badges

### Before (Dark Mode)
```css
Inquired:  bg-blue-500/20 text-blue-400 (rounded-full)
Bought:    bg-red-500/20 text-red-400 (rounded-full)
Arrived:   bg-yellow-500/20 text-yellow-400 (rounded-full)
Delivered: bg-emerald-500/20 text-emerald-400 (rounded-full)
```

### After (Light Mode)
```css
Inquired:  bg-blue-100 text-blue-700 border border-blue-300 (rounded)
Bought:    bg-red-100 text-red-700 border border-red-300 (rounded)
Arrived:   bg-yellow-100 text-yellow-700 border border-yellow-300 (rounded)
Delivered: bg-green-100 text-green-700 border border-green-300 (rounded)
```

Changes:
- ✅ Solid light backgrounds instead of transparent
- ✅ Darker text for better contrast
- ✅ Added borders for definition
- ✅ Less rounded (rounded instead of rounded-full)

## Form Inputs

### Before (Dark Mode)
```css
background: bg-white/5 (dark transparent)
border: border-white/10 (subtle)
text: text-white
placeholder: placeholder-slate-500
focus: focus:ring-emerald-500
```

### After (Light Mode)
```css
background: bg-gray-50 (light gray)
border: border-gray-200 (visible)
text: text-gray-900
placeholder: placeholder-gray-400
focus: focus:ring-emerald-500 (kept)
```

## Buttons

### Before (Dark Mode)
```css
Primary: bg-gradient-to-r from-emerald-500 to-teal-600 text-white
Secondary: bg-white/5 text-slate-300 hover:bg-white/10
Logout: text-slate-400 hover:text-white hover:bg-white/10
```

### After (Light Mode)
```css
Primary: bg-gradient-to-r from-emerald-500 to-teal-600 text-white (kept)
Secondary: bg-gray-50 text-gray-700 hover:bg-gray-100
Logout: text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300
```

## Header

### Before (Dark Mode)
```
┌────────────────────────────────────────────────┐
│ bg-white/5 backdrop-blur border-white/10       │
│                                                │
│ [Logo] UTS 1.0                    [Bell] User  │
│        Admin (amber badge)                     │
└────────────────────────────────────────────────┘
```

### After (Light Mode)
```
┌────────────────────────────────────────────────┐
│ bg-white border-gray-200 shadow-sm             │
│                                                │
│ [Logo] UTS 1.0                    [Bell] User  │
│        Admin (amber badge w/border)            │
└────────────────────────────────────────────────┘
```

## Typography

### Font Family
- **Before**: Arial, Helvetica, sans-serif
- **After**: Calibri, 'Segoe UI', Arial, sans-serif (Excel-like)

### Font Weights
- Headers: font-semibold (kept)
- Table headers: font-semibold (upgraded from font-medium)
- Data: Regular (kept)

## Spacing

### Table Cells
- **Before**: p-3 (12px padding)
- **After**: p-2 (8px padding) - More compact, Excel-like

### Rounded Corners
- **Before**: rounded-2xl (16px) everywhere
- **After**: 
  - Table: No rounding (sharp corners like Excel)
  - Modals: rounded-lg (8px)
  - Buttons: rounded-lg (8px)
  - Badges: rounded (4px)

## Field Name Changes

### Display Labels
| Before | After |
|--------|-------|
| Description | Particular |
| Contact | Supplier Contact |
| Customer | Customer Name |

### Table Column Order
**Before:**
Date → Unit → Qty → Description → Cost → VAT → Discount → Sales → Supplier → Contact → Customer → Customer Contact → Freight → Freight Type

**After:**
Date → Qty → Unit → Particular → Cost → Discount → Freight → Supplier → Customer → Sales → Remarks → D-Day

Key changes:
- ✅ Qty before Unit
- ✅ "Particular" instead of "Description"
- ✅ Discount before Freight
- ✅ VAT shown as badge on Sales column
- ✅ "Remarks" for Status
- ✅ "D-Day" for payment deadline

## Responsive Behavior

Both versions maintain responsive design:
- Mobile: Horizontal scroll for table
- Tablet: Adjusted column widths
- Desktop: Full table display

## Accessibility

Improvements in light mode:
- ✅ Better contrast ratios (WCAG AA compliant)
- ✅ Clearer borders for screen readers
- ✅ More visible focus states
- ✅ Darker text on light backgrounds

## Performance

No performance impact:
- Same number of DOM elements
- Simpler gradients (fewer in light mode)
- No backdrop-blur (better performance)
