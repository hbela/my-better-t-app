# Polar Integration Setup Guide

## Required Environment Variables

To enable Polar checkout, you need to add these environment variables to your `.env` file:

### Server Environment Variables (apps/server/.env or root .env)

```env
# Polar API Configuration
POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
POLAR_PRODUCT_ID=df02a74a-2dca-4e30-9428-3e23e1354bcf

# Webhook Secret (REQUIRED for production, recommended for dev)
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Optional: Custom success URL (defaults to CORS_ORIGIN/dashboard)
POLAR_SUCCESS_URL=http://localhost:5173/dashboard
```

## How to Get These Values

### 1. Get Your Polar Access Token

1. Go to [Polar Dashboard](https://polar.sh/dashboard)
2. Navigate to **Settings** → **API Keys**
3. Create a new API key or copy an existing one
4. The format will be: `polar_at_xxxxxxxxxxxxx`

### 2. Get Your Product ID

1. In Polar Dashboard, go to **Products**
2. Click on your product (e.g., "Booking Subscription")
3. Look at the URL or the product page - you'll see the **Product ID**
4. Copy the Product ID
5. The format will be: `df02a74a-2dca-4e30-9428-3e23e1354bcf`

**Example:** If your product URL is:
```
https://polar.sh/dashboard/elyscom/products/df02a74a-2dca-4e30-9428-3e23e1354bcf
```
Then your Product ID is: `df02a74a-2dca-4e30-9428-3e23e1354bcf`

### 3. Get Webhook Secret (Optional but Recommended)

1. In Polar Dashboard, go to **Settings** → **Webhooks**
2. Add your webhook endpoint: `https://your-domain.com/api/webhooks/polar`
3. Copy the **Signing Secret**
4. The format will be: `whsec_xxxxxxxxxxxxx`

## Testing the Integration

### Using Polar Test Mode

Polar provides a test mode for development:

1. Make sure your API key is a **test mode** key (starts with `polar_at_test_`)
2. Create a test product in Polar
3. Use the test product's price ID

### Test the Flow

1. Start your server:
   ```bash
   cd apps/server
   pnpm dev
   ```

2. Click "Subscribe Now" on an organization

3. You should be redirected to a valid Polar checkout page

4. Use Polar's test payment methods:
   - Test Card: Use Polar's test card numbers
   - Or complete a real payment if in live mode

## API Endpoint

The correct Polar API endpoint for creating checkout sessions is:
```
POST https://api.polar.sh/v1/checkout-sessions
```

## Troubleshooting

### Error: "Method Not Allowed" (405)

**Cause:** Using incorrect API endpoint.

**Fix:** The code now uses the correct endpoint: `https://api.polar.sh/v1/checkout-sessions`

### Error: "Payment system not configured"

**Cause:** `POLAR_ACCESS_TOKEN` or `POLAR_PRODUCT_ID` is missing from environment variables.

**Fix:** Add both variables to your `.env` file and restart the server.

### Error: "Failed to create checkout session"

**Possible causes:**
1. Invalid API token
2. Wrong Product ID
3. Product is not active/published in Polar
4. API token doesn't have proper permissions

**Fix:** 
- Verify your API token is correct
- Ensure you're using the correct **Product ID** from your product page
- Check that the product is **published** and active in Polar Dashboard
- Verify API token has checkout creation permissions
- Check server logs for the detailed error from Polar API

### 404 Error on Checkout Page

**Cause:** You were using the old placeholder URL instead of a real Polar checkout session.

**Fix:** ✅ Already fixed! The code now properly calls Polar's API.

## Example .env File

```env
# Database
DATABASE_URL=file:./prisma/dev.db

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
AUTH_SECRET=your-secret-key-here

# CORS
CORS_ORIGIN=http://localhost:5173

# Resend Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@yourdomain.com

# Polar Payment Integration
POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
POLAR_PRODUCT_ID=price_xxxxxxxxxxxxx
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Webhook Setup

After setting up your Polar credentials, configure the webhook:

1. **Webhook URL:** `https://your-domain.com/api/webhooks/polar` (or use ngrok for local testing)
2. **Events to subscribe:**
   - `order.created`
   - `subscription.created`
   - `subscription.canceled`
3. **Copy the Webhook Secret** and add to `.env`:
   ```env
   POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

The webhook will automatically:
- ✅ **Verify webhook signatures** for security
- ✅ Enable organizations when payment succeeds
- ✅ Send confirmation emails to owners
- ✅ Disable organizations if subscription is canceled

📚 **For detailed webhook setup (including ngrok for local development):**
See [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)

## Next Steps

After configuration:

1. ✅ Add environment variables to your `.env` file
2. ✅ Restart your development server
3. ✅ Test the Subscribe button
4. ✅ Complete a test payment
5. ✅ Verify organization is enabled after payment

## Support

- [Polar Documentation](https://docs.polar.sh)
- [Polar API Reference](https://api.polar.sh/docs)
- [Polar Discord Community](https://discord.gg/polar)

