# Dashboard UI Guide - Visual Reference

## 🎨 Dashboard Overview

The enhanced dashboard provides a comprehensive view of organizations, subscriptions, and billing at a glance.

## Layout Structure

### Top Section: Quick Stats
```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                                       │
│  Welcome, Test Owner                                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬───────────────────────────┐
│ Total            │ Active           │ Total                     │
│ Organizations    │ Subscriptions    │ Payments                  │
│                  │                  │                           │
│       3          │       2          │        6                  │
└──────────────────┴──────────────────┴───────────────────────────┘
```

### Main Section: Organizations & Subscriptions

#### Example 1: Active Subscription

```
┌─────────────────────────────────────────────────────────────────┐
│ My Organizations & Subscriptions                                 │
│ Manage your organizations and billing                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  🏥                                                         │ │
│  │  [Hospital Logo]  Test Hospital   [Active] [active]        │ │
│  │                   Role: owner                               │ │
│  │                   Monthly Subscription • $10.00/month       │ │
│  │                   Next billing: Nov 15, 2025                │ │
│  │                                      [View Details ▼]       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Example 2: Pending Subscription (Owner)

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo]  Medical Center     [Pending]                          │
│          Role: owner                                            │
│          ⚠️ This organization requires a subscription          │
│                                      [Subscribe Now]            │
└────────────────────────────────────────────────────────────────┘
```

#### Example 3: Organization as Member (Not Owner)

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo]  Clinic ABC         [Active] [active]                  │
│          Role: provider                                         │
│          Monthly Subscription • $10.00/month                    │
│          Next billing: Dec 1, 2025                              │
│                                      [View Details ▼]           │
└────────────────────────────────────────────────────────────────┘
```

### Expanded View: Subscription Details

When clicking "View Details":

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo]  Test Hospital      [Active] [active]                  │
│          Role: owner                                            │
│          Monthly Subscription • $10.00/month                    │
│          Next billing: Nov 15, 2025                             │
│                                      [Hide Details ▲]           │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┬─────────────────────────────────┐ │
│  │ Subscription Details    │ Recent Payments                 │ │
│  │                         │                                 │ │
│  │ Status: active          │ ┌─────────────────────────────┐│ │
│  │ Period Start: Oct 15    │ │ $10.00        [succeeded]   ││ │
│  │ Period End: Nov 15      │ │ Oct 15, 2025                ││ │
│  │                         │ └─────────────────────────────┘│ │
│  │                         │ ┌─────────────────────────────┐│ │
│  │                         │ │ $10.00        [succeeded]   ││ │
│  │                         │ │ Sep 15, 2025                ││ │
│  │                         │ └─────────────────────────────┘│ │
│  └─────────────────────────┴─────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Cancelled Subscription View

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo]  Old Clinic         [Pending] [cancelled]              │
│          Role: owner                                            │
│          Monthly Subscription • $10.00/month                    │
│          Cancelled: Oct 1, 2025                                 │
│                                      [View Details ▼]           │
└────────────────────────────────────────────────────────────────┘
```

## 🎨 Color Scheme

### Status Badges

| Status | Badge Color | Use Case |
|--------|------------|----------|
| **Active** | 🟢 Green | Organization enabled, subscription active |
| **Pending** | 🟡 Yellow | Awaiting payment or activation |
| **active** | 🟢 Green | Subscription is active |
| **cancelled** | 🔴 Red | Subscription was cancelled |
| **expired** | ⚪ Gray | Subscription expired |
| **succeeded** | 🟢 Green | Payment successful |

### Card Styles

- **Background**: Card component with border
- **Hover**: Subtle shadow (optional)
- **Expanded Section**: Muted background (`bg-muted/50`)
- **Payment Items**: Background contrast for readability

## 📱 Responsive Behavior

### Desktop (> 1024px)
```
┌──────────┬──────────┬──────────┐
│  Stat 1  │  Stat 2  │  Stat 3  │
└──────────┴──────────┴──────────┘

┌─────────────────────────────────┐
│  Organization Cards (full)      │
│  Side-by-side info + buttons    │
└─────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────┐
│  Stat 1  │
├──────────┤
│  Stat 2  │
├──────────┤
│  Stat 3  │
└──────────┘

┌────────────┐
│  Org Card  │
│  (stacked) │
└────────────┘
```

## 🎭 Interactive Elements

### Buttons

**Subscribe Now** (Primary)
- Variant: `default` (blue/accent)
- Full width on mobile
- Disabled during loading
- Only visible to owners of unpaid orgs

**View/Hide Details** (Secondary)
- Variant: `outline`
- Size: `sm`
- Toggles expanded view
- Only visible if subscription exists

### Loading States

**Initial Load:**
```
┌──────────────────────────────┐
│ [Animated gray bar]          │
├──────────────────────────────┤
│ [Animated gray bar]          │
└──────────────────────────────┘
```

**During Action:**
- Button shows loading text
- Button disabled
- Spinner (optional)

## 💬 Toast Notifications

### Success Messages
```
🎉 Payment successful! Your organization is being activated...
✅ Redirecting to checkout for Test Hospital...
```

### Error Messages
```
❌ Failed to load organizations
❌ Error creating checkout
❌ Failed to create checkout
```

## 🎯 User Experience Flow

### First-Time Owner (No Subscription)

1. **Sees**: Yellow "Pending" badge
2. **Message**: "⚠️ This organization requires a subscription"
3. **Action**: Big blue "Subscribe Now" button
4. **Click**: Redirects to Polar
5. **Return**: Success message
6. **Result**: Green "Active" badge with subscription details

### Returning User (Active Subscription)

1. **Sees**: Quick stats (3 cards)
2. **Views**: All organizations with inline info
3. **Reads**: Plan, price, next billing
4. **Clicks**: "View Details" for full info
5. **Sees**: Payment history and subscription dates

### Member (Not Owner)

1. **Sees**: Organizations they're part of
2. **Views**: Subscription details (read-only)
3. **Cannot**: Subscribe or manage billing
4. **Can**: View payment history (if allowed)

## 📊 Data Display Examples

### Currency Formatting
```typescript
1000 cents → $10.00
5000 cents → $50.00
999 cents  → $9.99
```

### Date Formatting
```typescript
"2025-10-15T12:00:00Z" → "Oct 15, 2025"
"2025-11-01T00:00:00Z" → "Nov 1, 2025"
```

### Status Display
```typescript
"active"    → [Active] (green badge)
"cancelled" → [cancelled] (red badge)
"pending"   → [pending] (yellow badge)
```

## 🎨 Design Principles

### 1. Progressive Disclosure
- Show essential info by default
- Hide details until requested
- Smooth expand/collapse

### 2. Visual Hierarchy
- Large headings for importance
- Muted text for secondary info
- Bold text for key data points

### 3. Status Communication
- Color-coded badges
- Clear status text
- Warning icons when needed

### 4. Actionable Design
- Primary actions prominent
- Secondary actions subtle
- Disabled states clear

### 5. Data Density
- Not overwhelming
- Scannable layout
- Important data emphasized

## 🖼️ Component Breakdown

### Quick Stats Card
```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-sm">Label</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">Value</div>
  </CardContent>
</Card>
```

### Organization Card
```tsx
<div className="rounded-lg border p-4">
  <div className="flex justify-between">
    <div className="flex gap-4">
      <img /> {/* Logo */}
      <div>
        <h3 /> {/* Name + Badges */}
        <p />  {/* Role */}
        <div /> {/* Subscription Info */}
      </div>
    </div>
    <div className="flex gap-2">
      <Button /> {/* Actions */}
    </div>
  </div>
</div>
```

### Expandable Section
```tsx
{isExpanded && (
  <div className="border-t bg-muted/50 p-4">
    <div className="grid md:grid-cols-2 gap-4">
      <div>{/* Left column */}</div>
      <div>{/* Right column */}</div>
    </div>
  </div>
)}
```

## 🔧 Customization Options

### Modify Quick Stats
Edit `apps/web/src/routes/dashboard.tsx` line ~180:
- Add more stat cards
- Change metrics
- Update labels

### Adjust Colors
Modify Tailwind classes:
- Change badge colors
- Update card backgrounds
- Adjust text colors

### Add More Details
Extend subscription details section:
- Add more fields
- Include graphs
- Add action buttons

## 🎬 Animation Ideas (Future)

- Smooth expand/collapse transitions
- Fade in payment history items
- Pulse effect on stats after update
- Confetti on successful payment
- Loading shimmer effect

## 📏 Spacing & Layout

- **Container**: `max-w-7xl` (wider for more content)
- **Card Padding**: `p-4` standard
- **Gap Between Cards**: `space-y-6`
- **Stat Card Gap**: `gap-4`
- **Grid Columns**: 3 on desktop, 1 on mobile

---

This enhanced dashboard provides a **world-class subscription management experience**! 🌟

