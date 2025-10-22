# Enhanced Subscription Database Schema

## Overview

The subscription system has been enhanced with proper database models to track products, subscriptions, and payments instead of just relying on the organization's `enabled` flag.

## Database Models

### 1. Product
Represents subscription products from Polar.

```prisma
model Product {
  id            String         @id
  polarId       String         @unique  // Polar's product ID
  name          String
  description   String?
  priceCents    Int            // Price in cents (e.g., 1000 = $10.00)
  currency      String         @default("USD")
  interval      String?        // "month", "year", null for one-time
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  subscriptions Subscription[]
}
```

**Purpose:** Stores product information from Polar for reference and reporting.

### 2. Subscription
Tracks active and historical subscriptions.

```prisma
model Subscription {
  id                 String    @id
  polarCheckoutId    String?   @unique
  polarSubscriptionId String?  @unique
  polarCustomerId    String?
  status             String    // "active", "cancelled", "expired", "pending"
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  cancelledAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  // Relations
  userId             String
  user               User
  organizationId     String
  organization       Organization
  productId          String
  product            Product
  payments           Payment[]
}
```

**Purpose:** Central record of subscription lifecycle.

### 3. Payment
Tracks individual payments for subscriptions.

```prisma
model Payment {
  id              String       @id
  polarPaymentId  String?      @unique
  amount          Int          // Amount in cents
  currency        String       @default("USD")
  status          String       // "succeeded", "pending", "failed", "refunded"
  paymentMethod   String?
  receiptUrl      String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  subscriptionId  String
  subscription    Subscription
}
```

**Purpose:** Maintains payment history for billing and reporting.

## Relationships

```
User (1) ----< (∞) Subscription
Organization (1) ----< (∞) Subscription
Product (1) ----< (∞) Subscription
Subscription (1) ----< (∞) Payment
```

## Data Flow

### Checkout Creation

```
1. User clicks "Subscribe Now"
   ↓
2. Server checks/creates Product in database
   ↓
3. Polar checkout session created
   ↓
4. User redirected to Polar
```

### Payment Success (Webhook)

```
1. Polar sends webhook: order.created
   ↓
2. Server verifies signature
   ↓
3. ensureProduct() - Create/fetch product
   ↓
4. Create/Update Subscription record
   ├─ status: "active"
   ├─ polarCheckoutId
   ├─ polarSubscriptionId
   └─ currentPeriodStart/End
   ↓
5. Create Payment record
   ├─ amount
   ├─ status: "succeeded"
   └─ polarPaymentId
   ↓
6. Enable Organization (enabled: true)
   ↓
7. Send confirmation email
```

### Subscription Cancellation (Webhook)

```
1. Polar sends webhook: subscription.canceled
   ↓
2. Server verifies signature
   ↓
3. Update Subscription
   ├─ status: "cancelled"
   └─ cancelledAt: now()
   ↓
4. Disable Organization (enabled: false)
```

## API Endpoints

### Get User's Subscriptions
```http
GET /api/subscriptions/my-subscriptions
Authorization: Cookie (session)
```

**Response:**
```json
[
  {
    "id": "sub_123",
    "status": "active",
    "currentPeriodStart": "2025-10-15T...",
    "currentPeriodEnd": "2025-11-15T...",
    "product": {
      "name": "Monthly Subscription",
      "priceCents": 1000,
      "interval": "month"
    },
    "organization": {
      "id": "org_123",
      "name": "Test Hospital",
      "slug": "test-hospital"
    },
    "payments": [
      {
        "id": "pay_456",
        "amount": 1000,
        "status": "succeeded",
        "createdAt": "2025-10-15T..."
      }
    ]
  }
]
```

### Get Organization Subscription
```http
GET /api/subscriptions/organization/:organizationId
Authorization: Cookie (session)
```

**Response:**
```json
{
  "id": "sub_123",
  "status": "active",
  "currentPeriodStart": "2025-10-15T...",
  "currentPeriodEnd": "2025-11-15T...",
  "product": {
    "name": "Monthly Subscription",
    "priceCents": 1000
  },
  "user": {
    "id": "user_123",
    "name": "Test Owner",
    "email": "owner@test.com"
  },
  "payments": [...]
}
```

### Get Payment History
```http
GET /api/payments/subscription/:subscriptionId
Authorization: Cookie (session)
```

**Response:**
```json
[
  {
    "id": "pay_789",
    "amount": 1000,
    "currency": "USD",
    "status": "succeeded",
    "createdAt": "2025-10-15T...",
    "polarPaymentId": "pi_polar_123"
  }
]
```

## Benefits of Enhanced Schema

### 1. Complete Payment History
- Track all payments, not just current status
- View payment timeline
- Monitor failed/refunded payments

### 2. Multiple Subscriptions Support
- Organization can have multiple subscriptions
- User can subscribe to multiple organizations
- Track subscription history even after cancellation

### 3. Detailed Reporting
- Calculate MRR (Monthly Recurring Revenue)
- Track churn rate
- Analyze subscription patterns

### 4. Better UX
- Show subscription details on dashboard
- Display payment history
- Show renewal dates

### 5. Compliance & Auditing
- Maintain complete transaction records
- Track subscription changes over time
- Generate invoices from payment history

## Migration from Old System

### Before (Simple Flag)
```json
{
  "organization": {
    "enabled": true,
    "metadata": "{\"subscriptionId\": \"...\"}"
  }
}
```

### After (Full Records)
```json
{
  "organization": {
    "enabled": true
  },
  "subscription": {
    "id": "...",
    "status": "active",
    "product": {...},
    "payments": [...]
  }
}
```

## Subscription Status Values

| Status | Description |
|--------|-------------|
| `active` | Subscription is active and paid |
| `pending` | Payment initiated but not confirmed |
| `cancelled` | Subscription was cancelled |
| `expired` | Subscription expired (not renewed) |

## Payment Status Values

| Status | Description |
|--------|-------------|
| `succeeded` | Payment completed successfully |
| `pending` | Payment processing |
| `failed` | Payment failed |
| `refunded` | Payment was refunded |

## Example Queries

### Find Active Subscriptions
```typescript
const activeSubscriptions = await prisma.subscription.findMany({
  where: {
    status: "active",
  },
  include: {
    product: true,
    organization: true,
    user: true,
  },
});
```

### Calculate MRR
```typescript
const mrr = await prisma.subscription.aggregate({
  where: {
    status: "active",
  },
  _sum: {
    // This would need a calculated field or join to product
  },
});
```

### Get Payment History for Organization
```typescript
const payments = await prisma.payment.findMany({
  where: {
    subscription: {
      organizationId: "org_123",
    },
  },
  include: {
    subscription: {
      include: {
        product: true,
      },
    },
  },
  orderBy: {
    createdAt: "desc",
  },
});
```

## Testing the New Schema

1. **Create a subscription:**
   ```bash
   POST /api/subscriptions/create-checkout
   # Complete payment on Polar
   ```

2. **Verify database records:**
   ```sql
   SELECT * FROM product;
   SELECT * FROM subscription;
   SELECT * FROM payment;
   ```

3. **Check API endpoints:**
   ```bash
   GET /api/subscriptions/my-subscriptions
   GET /api/subscriptions/organization/{id}
   ```

4. **Test cancellation:**
   ```bash
   # Trigger cancellation webhook from Polar
   # Verify subscription status = "cancelled"
   # Verify organization enabled = false
   ```

## Future Enhancements

### Possible Additions

1. **Invoice Model**
   - Generate invoices from payments
   - PDF generation
   - Email invoices to customers

2. **Usage Tracking**
   - Track API usage
   - Track feature usage
   - Implement usage-based billing

3. **Proration Support**
   - Handle plan upgrades/downgrades
   - Calculate prorated amounts

4. **Trial Periods**
   - Track trial start/end dates
   - Automatic conversion to paid

5. **Multiple Payment Methods**
   - Store payment method details
   - Allow customers to update cards

## Security Considerations

- ✅ All payment data comes from Polar webhook (verified signature)
- ✅ No credit card info stored locally
- ✅ User can only view their own subscriptions
- ✅ Organization members can view org subscription
- ✅ Payment amounts stored in cents (avoid floating point issues)

## Support

For issues or questions:
- Check webhook logs in Polar dashboard
- Verify database records match Polar data
- Check server logs for webhook processing
- Ensure Prisma client is up to date after schema changes

