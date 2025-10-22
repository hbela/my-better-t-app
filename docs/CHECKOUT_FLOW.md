# Polar Checkout Flow Implementation

## Overview
The checkout flow allows organization owners to subscribe and activate their organizations through Polar payment processing.

## Flow Diagram

```
1. Admin creates organization (disabled by default)
   ↓
2. Owner sees "Pending Subscription" status on dashboard
   ↓
3. Owner clicks "Subscribe Now" button
   ↓
4. Frontend calls /api/subscriptions/create-checkout
   ↓
5. Backend creates Polar checkout session
   ↓
6. Backend returns checkoutUrl
   ↓
7. Frontend redirects user to Polar checkout page
   ↓
8. User completes payment on Polar
   ↓
9. Polar sends webhook to /api/webhooks/polar
   ↓
10. Backend enables organization (enabled: true)
   ↓
11. Organization is now active ✅
```

## Frontend Implementation

### Admin Page (`/admin`)
- Lists all organizations with status badges (Active/Pending)
- Shows "Subscribe" button for organizations with `enabled: false`
- Button calls checkout API and redirects to Polar

```tsx
const handleSubscribe = async (orgId: string, orgName: string) => {
  const response = await fetch(
    `${import.meta.env.VITE_SERVER_URL}/api/subscriptions/create-checkout`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ organizationId: orgId }),
    }
  );
  
  const data = await response.json();
  window.location.href = data.checkoutUrl; // Redirect to Polar
};
```

### Dashboard Page (`/dashboard`)
- Shows user's organizations with subscription status
- Displays "Subscribe Now" button for owners of unpaid organizations
- Uses same checkout flow as admin page

## Backend Endpoints

### 1. Create Checkout Session
**POST** `/api/subscriptions/create-checkout`

**Request:**
```json
{
  "organizationId": "9c91d5a8-6dac-49ec-b488-6f803a81ae38"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://polar.sh/checkout?org=test-hospital&product=...",
  "organizationId": "9c91d5a8-6dac-49ec-b488-6f803a81ae38",
  "organizationName": "Test Hospital",
  "amount": "$10.00/month",
  "message": "Complete payment to activate your organization"
}
```

### 2. Get User's Organizations
**GET** `/api/organizations/my-organizations`

**Response:**
```json
[
  {
    "id": "...",
    "name": "Test Hospital",
    "slug": "test-hospital",
    "logo": "...",
    "enabled": false,
    "createdAt": "2025-10-14T...",
    "role": "owner",
    "memberSince": "2025-10-14T..."
  }
]
```

### 3. Polar Webhook Handler
**POST** `/api/webhooks/polar`

Receives webhook events from Polar and automatically:
- Enables the organization when payment is successful
- Updates organization metadata with subscription details
- Sends confirmation email to the owner

## Environment Variables

Required for Polar integration:

```env
POLAR_ACCESS_TOKEN=your-polar-access-token
POLAR_PRODUCT_ID=your-product-id
POLAR_WEBHOOK_SECRET=your-webhook-secret
```

## Testing the Flow

1. **Create an organization** (as admin):
   ```bash
   POST /api/admin/organizations/create
   {
     "name": "Test Hospital",
     "slug": "test-hospital",
     "ownerId": "user-id"
   }
   ```

2. **View dashboard** (as owner):
   - Navigate to `/dashboard`
   - See organization with "Pending Subscription" badge

3. **Click "Subscribe Now"**:
   - Redirects to Polar checkout
   - Complete payment (use test mode in Polar)

4. **Webhook received**:
   - Polar sends webhook to your server
   - Organization is automatically enabled

5. **Verify**:
   - Refresh dashboard
   - Organization now shows "Active" badge
   - Features are now accessible

## Security Notes

- ✅ Only authenticated users can create checkouts
- ✅ Only organization members can subscribe
- ✅ Checkout sessions are unique per organization
- ✅ Webhook signature verification ensures authenticity
- ✅ Organization remains disabled until payment is confirmed

## UI Features

### Status Badges
- 🟢 **Active**: Organization is enabled and subscribed
- 🟡 **Pending Subscription**: Organization needs payment

### Subscribe Button
- Only visible to organization owners
- Only shown for unpaid organizations
- Disabled during API calls
- Shows loading state during redirect

## Next Steps

After webhook enables the organization:
1. User can create departments
2. User can assign providers
3. Providers can create events
4. Members can book appointments

