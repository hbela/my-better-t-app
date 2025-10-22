# Webhook Setup Guide - Polar Integration

## Overview

This guide explains how to set up Polar webhooks with ngrok for local development and how the webhook signature verification works.

## Environment Variables

Add these to your `.env` file:

```env
# Polar Configuration
POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
POLAR_PRODUCT_ID=df02a74a-2dca-4e30-9428-3e23e1354bcf
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
POLAR_SUCCESS_URL=http://localhost:5173/dashboard  # Optional, defaults to CORS_ORIGIN/dashboard
```

## Webhook Signature Verification

### How It Works

The webhook endpoint (`/api/webhooks/polar`) now includes **signature verification** to ensure webhooks are genuinely from Polar:

1. **Polar sends a signature** in the `Polar-Signature` header
2. **Our server recreates the signature** using:
   - The raw webhook payload
   - Your `POLAR_WEBHOOK_SECRET`
   - HMAC SHA-256 algorithm
3. **Signatures are compared** - webhook is rejected if they don't match

### Implementation

```typescript
// Verify webhook signature
const signature = req.headers["polar-signature"] as string;
const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

if (webhookSecret && signature) {
  const payload = req.body.toString("utf8");
  
  // Create HMAC signature
  const hmac = crypto.createHmac("sha256", webhookSecret);
  const digest = hmac.update(payload).digest("hex");
  const expectedSignature = `sha256=${digest}`;

  // Verify signature
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: "Invalid signature" });
  }
}
```

### Security Levels

- ✅ **With POLAR_WEBHOOK_SECRET**: Signature verification enabled (recommended)
- ⚠️ **Without POLAR_WEBHOOK_SECRET**: Verification skipped (dev only)

## Setting Up Webhooks with ngrok

### Step 1: Install and Start ngrok

```bash
# Install ngrok (if not already installed)
# Download from: https://ngrok.com/download

# Start ngrok tunnel to your local server
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### Step 2: Configure Webhook in Polar

1. Go to [Polar Dashboard](https://polar.sh/dashboard)
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Enter your webhook URL:
   ```
   https://abc123.ngrok.io/api/webhooks/polar
   ```
5. Select events to subscribe to:
   - ✅ `order.created`
   - ✅ `subscription.created`
   - ✅ `subscription.canceled`
6. Copy the **Webhook Secret** (starts with `whsec_`)
7. Add it to your `.env` file as `POLAR_WEBHOOK_SECRET`

### Step 3: Test the Webhook

1. **Restart your server** after adding the webhook secret
2. Click "Subscribe" on an organization
3. Complete payment on Polar's checkout page
4. Watch your server logs for:
   ```
   ✅ Webhook signature verified
   📥 Received Polar webhook: { type: 'order.created', timestamp: '...' }
   Organization enabled via Polar webhook: { id: '...', name: '...', enabled: true }
   ```

## Production Setup

### For Production Deployment

1. **Use your production domain** instead of ngrok:
   ```
   https://api.yourdomain.com/api/webhooks/polar
   ```

2. **Environment variables** should be set on your hosting platform:
   ```env
   POLAR_ACCESS_TOKEN=polar_at_prod_xxxxx
   POLAR_PRODUCT_ID=your-prod-product-id
   POLAR_WEBHOOK_SECRET=whsec_prod_xxxxx
   POLAR_SUCCESS_URL=https://yourdomain.com/dashboard
   CORS_ORIGIN=https://yourdomain.com
   ```

3. **Webhook signature verification** is **mandatory** in production

## Webhook Events Handled

### 1. `order.created` or `subscription.created`

**What happens:**
- ✅ Organization is **enabled** (`enabled: true`)
- 📧 Confirmation email sent to owner
- 💾 Subscription metadata saved to organization

**Metadata stored:**
```json
{
  "polarCustomerId": "cus_xxxxx",
  "subscriptionId": "sub_xxxxx",
  "subscriptionStatus": "active",
  "subscriptionStartedAt": "2025-10-15T..."
}
```

### 2. `subscription.canceled`

**What happens:**
- ❌ Organization is **disabled** (`enabled: false`)
- 💾 Cancellation metadata updated

**Metadata updated:**
```json
{
  "subscriptionStatus": "canceled",
  "subscriptionCanceledAt": "2025-10-15T..."
}
```

## Success URL Flow

When a customer completes payment:

1. **Polar redirects** to: `{POLAR_SUCCESS_URL}?subscribed=true&organizationId={id}`
2. **Dashboard shows toast**: "🎉 Payment successful! Your organization is being activated..."
3. **Organizations reload** after 2 seconds to show updated status
4. **Webhook processes** in background to enable organization

## Troubleshooting

### Webhook Not Received

**Check:**
- ✅ ngrok is running and forwarding to port 3000
- ✅ Webhook URL in Polar matches your ngrok URL
- ✅ Server is running and listening on port 3000
- ✅ Firewall/antivirus not blocking ngrok

### Invalid Signature Error

**Possible causes:**
1. Wrong webhook secret
2. Webhook secret mismatch between Polar and `.env`
3. Request body was modified before reaching verification

**Fix:**
- Copy webhook secret exactly from Polar
- Restart server after updating `.env`
- Ensure middleware order is correct (raw body parser must come first)

### Organization Not Enabling

**Check server logs for:**
- ✅ Webhook received
- ✅ Signature verified
- ✅ `organizationId` in metadata
- ✅ No database errors

**Common issues:**
- Metadata doesn't contain `organizationId`
- Organization ID doesn't exist in database
- Database connection issue

## Testing Checklist

- [ ] ngrok tunnel running
- [ ] Webhook configured in Polar with correct URL
- [ ] `POLAR_WEBHOOK_SECRET` in `.env`
- [ ] Server restarted after adding secret
- [ ] Test payment completed
- [ ] Webhook signature verified in logs
- [ ] Organization enabled in database
- [ ] Confirmation email sent
- [ ] Dashboard shows "Active" status

## Monitoring Webhooks

### View Webhook Logs in Polar

1. Go to Polar Dashboard → Settings → Webhooks
2. Click on your webhook
3. View delivery history and responses
4. Check for failed deliveries

### Server Logs to Watch

```bash
# Good webhook flow:
✅ Webhook signature verified
📥 Received Polar webhook: { type: 'order.created' }
Organization enabled via Polar webhook: { name: 'Test Hospital', enabled: true }

# Failed signature:
❌ Invalid webhook signature

# Missing configuration:
⚠️ Webhook signature verification skipped (POLAR_WEBHOOK_SECRET not set)
```

## Advanced: Custom Success URL

You can customize where users are redirected after payment:

```env
# Redirect to a custom success page
POLAR_SUCCESS_URL=https://yourdomain.com/subscription/success

# Or use query parameters for tracking
POLAR_SUCCESS_URL=https://yourdomain.com/dashboard?source=polar
```

The organizationId will be appended automatically:
```
https://yourdomain.com/dashboard?source=polar&subscribed=true&organizationId=abc123
```

## Support

- [Polar Webhook Documentation](https://docs.polar.sh/webhooks)
- [ngrok Documentation](https://ngrok.com/docs)
- [Webhook Signature Verification Best Practices](https://docs.polar.sh/webhooks/signature-verification)

