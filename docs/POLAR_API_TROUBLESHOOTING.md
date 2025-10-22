# Polar API Troubleshooting Guide

## Current Issue: 404 Not Found

The endpoint `POST https://api.polar.sh/v1/checkout-sessions` is returning a 404 error.

## Possible Causes

### 1. Incorrect API Endpoint
Polar might use a different endpoint structure. Common alternatives:
- `POST /v1/checkouts`
- `POST /v1/checkout-links`
- `POST /v1/products/{id}/checkout`
- Different API version (v2, etc.)

### 2. Product Not Published
The product might not be published or active in Polar dashboard.

### 3. Different Integration Method
Polar might use:
- Checkout links instead of API
- Embedded checkout forms
- Different authentication method

## 🔍 Finding the Correct API

### Option 1: Check Polar Dashboard

1. Go to **Polar Dashboard** → **Settings** → **Developers** or **API**
2. Look for:
   - API documentation link
   - Example code
   - API reference
   - Webhook/Integration guides

### Option 2: Check Product Settings

1. Go to your product page:
   ```
   https://polar.sh/dashboard/elyscom/products/df02a74a-2dca-4e30-9428-3e23e1354bcf
   ```

2. Look for:
   - "Checkout Link" or "Payment Link"
   - "Integration" or "Embed" options
   - API examples

### Option 3: Use Pre-generated Checkout Links

Polar might provide static checkout links per product. If so, use:

```
https://polar.sh/checkout/elyscom/df02a74a-2dca-4e30-9428-3e23e1354bcf
```

## 🔧 Alternative Implementation

If Polar doesn't support dynamic checkout API, we can use **static checkout links**:

### Backend Change

```typescript
// Instead of calling Polar API
const checkoutUrl = `https://polar.sh/${organization.slug}/${polarProductId}/checkout`;

// Or with your organization slug
const checkoutUrl = `https://polar.sh/checkout/elyscom/${polarProductId}`;

res.json({
  checkoutUrl,
  organizationId: organization.id,
  organizationName: organization.name,
  amount: "$10.00/month",
  message: "Complete payment to activate your organization",
});
```

Benefits:
- No API call needed
- Simpler implementation
- Still uses webhooks for activation

Drawbacks:
- Can't pass metadata dynamically
- Must configure metadata in Polar dashboard
- Less flexible

## 🧪 Testing Different Endpoints

Run the test script I created:

```bash
cd apps/server
npx tsx test-polar-api.ts
```

This will test multiple endpoint variations and show which one works.

## 📋 Checklist Before Testing

- [ ] Product is **published** in Polar dashboard
- [ ] API token has **checkout creation** permissions
- [ ] Product ID is correct: `df02a74a-2dca-4e30-9428-3e23e1354bcf`
- [ ] Access token is valid and not expired
- [ ] Using correct API endpoint

## 💡 Recommended Actions

### 1. Check Polar Dashboard for API Docs

Look for:
- Settings → API
- Settings → Developers
- Product page → Integration
- Any "API Reference" link

### 2. Try Static Checkout URL

Update the code to use a simpler approach:

```typescript
const checkoutUrl = `https://polar.sh/elyscom/products/${polarProductId}`;
```

### 3. Contact Polar Support

If no API documentation is found:
- Check Polar's Discord/Community
- Contact Polar support
- Check GitHub if Polar has open-source docs

## 🔄 Interim Solution: Manual Webhook Configuration

While figuring out the checkout API, you can:

1. **Use Polar's dashboard** to generate checkout links
2. **Configure webhook metadata** in Polar dashboard
3. **Manually pass organization ID** through URL parameters
4. **Webhook still works** to activate organizations

## 📝 Questions to Answer

To help troubleshoot, please check:

1. **Does Polar have API documentation?**
   - Check Settings → API in dashboard
   - Look for "Developers" section

2. **What does your product page show?**
   - Any "Checkout Link" or "Payment Link" buttons?
   - Any integration code snippets?

3. **Is there a checkout URL generator?**
   - Some platforms provide URL builders
   - Might be in product settings

4. **What permissions does your API token have?**
   - Check token settings in Polar
   - Might need to enable "Checkout" permissions

## 🎯 Next Steps

**Immediate:**
1. Check Polar dashboard for API documentation
2. Try running `test-polar-api.ts` to test different endpoints
3. Share the results

**Alternative:**
1. Use static checkout URLs (simpler, might be sufficient)
2. Configure webhook metadata in Polar dashboard
3. Still enables organizations automatically via webhook

Let me know what you find in your Polar dashboard! 🔍

