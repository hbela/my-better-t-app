# Complete Testing Checklist - Subscription System

## ✅ What's Working So Far

1. ✅ Password changed using better-auth's scrypt
2. ✅ Checkout creation with Polar Sandbox API
3. ✅ Redirect to Polar checkout page
4. ✅ Webhook receives and processes payment
5. ✅ Dashboard updates after payment

## 🧪 Complete Testing Scenarios

### Test 1: Full Subscription Flow

**Steps:**
1. [ ] Login as organization owner
2. [ ] Navigate to `/dashboard`
3. [ ] Verify organization shows "Pending" status
4. [ ] Click "Subscribe Now"
5. [ ] Redirected to Polar sandbox checkout
6. [ ] Complete test payment on Polar
7. [ ] Redirected back to dashboard
8. [ ] Success toast appears
9. [ ] Dashboard shows "Active" status
10. [ ] Organization badge changes from Yellow to Green

**Expected Results:**
- Success toast: "🎉 Payment successful! Your organization is being activated..."
- Organization status: "Active" (green badge)
- Subscription badge: "active" (green)
- Quick stats updated: Active Subscriptions = 1

**Database Checks:**
```sql
-- Check organization enabled
SELECT enabled FROM organization WHERE id = '...';
-- Should be: true

-- Check subscription created
SELECT * FROM subscription WHERE organizationId = '...';
-- Should have: status = 'active'

-- Check payment recorded
SELECT * FROM payment ORDER BY createdAt DESC LIMIT 1;
-- Should show: amount, status = 'succeeded'

-- Check product created
SELECT * FROM product;
-- Should show: Your Polar product
```

### Test 2: Subscription Details View

**Steps:**
1. [ ] On dashboard, find organization with active subscription
2. [ ] Click "View Details"
3. [ ] Expandable section opens
4. [ ] Verify "Subscription Details" section shows:
   - [ ] Status: active
   - [ ] Period Start date
   - [ ] Period End date
5. [ ] Verify "Recent Payments" section shows:
   - [ ] Payment amount ($10.00 or your price)
   - [ ] Payment date
   - [ ] Status badge: "succeeded"

**Expected Results:**
- All dates formatted correctly (e.g., "Oct 15, 2025")
- Currency formatted correctly (e.g., "$10.00")
- Status badges color-coded properly

### Test 3: Quick Stats Display

**Steps:**
1. [ ] View dashboard top section
2. [ ] Verify "Total Organizations" count
3. [ ] Verify "Active Subscriptions" count
4. [ ] Verify "Total Payments" count

**Expected Results:**
- Numbers match actual data
- Stats update after new payment

### Test 4: Multiple Organizations

**As Admin:**
1. [ ] Create another organization with same owner
2. [ ] Login as owner
3. [ ] Dashboard shows both organizations
4. [ ] One active, one pending

**Expected Results:**
- Both organizations listed
- Different statuses shown correctly
- Subscribe button only on pending org

### Test 5: Webhook Signature Verification

**Steps:**
1. [ ] Check server logs when webhook arrives
2. [ ] Look for: "✅ Webhook signature verified"
3. [ ] OR: "⚠️ Webhook secret is set but no signature received"

**Test Invalid Signature:**
1. [ ] Change `POLAR_WEBHOOK_SECRET` to wrong value
2. [ ] Trigger webhook
3. [ ] Should see: "❌ Invalid webhook signature"
4. [ ] Organization should NOT be enabled

**Fix:**
1. [ ] Restore correct `POLAR_WEBHOOK_SECRET`
2. [ ] Test again

### Test 6: API Endpoints

**Test My Subscriptions:**
```bash
curl -X GET http://localhost:3000/api/subscriptions/my-subscriptions \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  --cookie-jar cookies.txt
```

**Expected Response:**
```json
[
  {
    "id": "sub_...",
    "status": "active",
    "product": {
      "name": "Monthly Subscription",
      "priceCents": 1000
    },
    "organization": {
      "name": "Test Hospital"
    },
    "payments": [...]
  }
]
```

**Test Organization Subscription:**
```bash
curl -X GET http://localhost:3000/api/subscriptions/organization/ORG_ID \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
```

### Test 7: Edge Cases

**No Subscriptions:**
1. [ ] Login as new user (no organizations)
2. [ ] Dashboard shows empty state
3. [ ] Message: "You are not a member of any organizations yet."

**Member (Not Owner):**
1. [ ] Have admin add you as member of organization
2. [ ] Login and view dashboard
3. [ ] See organization but NO "Subscribe Now" button
4. [ ] Can view details if subscription exists

**Cancelled Subscription:**
1. [ ] Trigger cancellation webhook from Polar
2. [ ] Dashboard shows "cancelled" badge (red)
3. [ ] Organization status changes to "Pending"
4. [ ] Organization disabled in database

### Test 8: Loading States

**Steps:**
1. [ ] Clear browser cache
2. [ ] Navigate to `/dashboard`
3. [ ] Should see skeleton loaders
4. [ ] Smooth transition to actual data

**Expected:**
- No content flashing
- Smooth loading experience
- Skeletons match final layout

### Test 9: Success URL Redirect

**Steps:**
1. [ ] Complete payment on Polar
2. [ ] Verify redirect URL is correct:
   ```
   http://localhost:5173/dashboard?subscribed=true&organizationId=...
   ```
3. [ ] Success toast appears immediately
4. [ ] URL cleaned up after 2 seconds
5. [ ] Data reloads showing updated status

**Expected:**
- Toast duration: 5 seconds
- URL cleaned to: `http://localhost:5173/dashboard`
- Organizations reload with new data

### Test 10: Error Handling

**Invalid Organization ID:**
```bash
POST /api/subscriptions/create-checkout
{
  "organizationId": "invalid-id"
}
```
**Expected:** 404 "Organization not found"

**Already Subscribed:**
1. [ ] Subscribe to organization
2. [ ] Try to subscribe again
3. [ ] Should get error: "Organization is already subscribed"

**Not Organization Owner:**
1. [ ] Login as member (not owner)
2. [ ] Try to call create-checkout API
3. [ ] Should get: 403 "Forbidden - Owner access required"

## 📊 Database Verification

After completing a subscription, verify:

```sql
-- Products table
SELECT * FROM product;
-- Should have: Your Polar product with correct price

-- Subscriptions table
SELECT * FROM subscription;
-- Should have:
--   - polarCheckoutId
--   - polarSubscriptionId
--   - status = 'active'
--   - userId and organizationId linked

-- Payments table
SELECT * FROM payment;
-- Should have:
--   - amount in cents
--   - status = 'succeeded'
--   - subscriptionId linked

-- Organization enabled
SELECT enabled FROM organization WHERE id = '...';
-- Should be: true
```

## 🔍 Server Logs to Check

**Successful Flow Logs:**
```
🔄 Creating Polar checkout: { environment: 'SANDBOX', ... }
📡 Polar API Response: 200
✅ Checkout session created: { id: '...', url: '...' }

[After payment completed]

📥 Webhook received, body type: object
📝 Raw body length: ...
✅ Webhook signature verified
📥 Received Polar webhook: { type: 'order.created', ... }
✨ Created product in database: { name: '...', ... }
✅ Organization enabled via Polar webhook: Test Hospital
💳 Subscription created: sub_...
💰 Payment recorded
```

## 🐛 Common Issues & Solutions

### Issue: Dashboard Not Updating

**Symptoms:** 
- Payment completed
- Redirected back
- Organization still shows "Pending"

**Check:**
1. Server logs - Was webhook received?
2. Database - Is organization.enabled = true?
3. Browser console - Any API errors?
4. Network tab - Is /my-subscriptions returning data?

**Fix:**
- Hard refresh page (Ctrl+Shift+R)
- Check webhook was received and processed
- Verify no errors in webhook handler

### Issue: Webhook Not Received

**Symptoms:**
- Payment completed
- No webhook in server logs

**Check:**
1. Is ngrok still running?
2. Did ngrok URL change? (update in Polar)
3. Is webhook configured correctly in Polar?
4. Check Polar dashboard → Webhooks → Delivery logs

**Fix:**
- Restart ngrok
- Update webhook URL in Polar
- Test webhook delivery manually in Polar

### Issue: "Invalid signature" Error

**Symptoms:**
- Webhook received
- Log: "❌ Invalid webhook signature"

**Check:**
1. `POLAR_WEBHOOK_SECRET` matches Polar dashboard
2. No extra whitespace in env variable
3. Using correct secret (sandbox vs production)

**Fix:**
- Copy webhook secret again from Polar
- Ensure no spaces before/after
- Restart server

### Issue: Payment Shows But Organization Not Enabled

**Symptoms:**
- Payment in database
- Subscription in database  
- Organization still disabled

**Check Server Logs:**
- Was there an error after "Payment recorded"?
- Did organization update query run?
- Any database errors?

**Fix:**
- Check webhook handler code
- Verify organizationId in metadata
- Check database constraints

## 📧 Email Testing

If using Resend:

**Check:**
1. [ ] Email sent after organization activation
2. [ ] Correct recipient (owner email)
3. [ ] Correct subject
4. [ ] HTML renders properly
5. [ ] Links work

**Logs to Check:**
```
Error sending subscription activation email: ...
```

If no error = email was sent successfully!

## 🎯 Production Testing Checklist

Before going live:

**Environment:**
- [ ] Switch `POLAR_SANDBOX=false` (or remove)
- [ ] Update `POLAR_ACCESS_TOKEN` to production token
- [ ] Update `POLAR_PRODUCT_ID` to production product
- [ ] Update `POLAR_WEBHOOK_SECRET` to production secret
- [ ] Update `POLAR_SUCCESS_URL` to production URL
- [ ] Configure webhook in production Polar dashboard

**Verify:**
- [ ] Real payments work
- [ ] Webhook receives production events
- [ ] Emails sent from production domain
- [ ] CORS configured for production domain
- [ ] Database backed up before testing

## 📱 Frontend Testing

**Responsive Design:**
1. [ ] Test on mobile screen (Chrome DevTools)
2. [ ] Stats cards stack vertically
3. [ ] Organization cards readable on mobile
4. [ ] Buttons accessible
5. [ ] Details expand properly

**Browser Compatibility:**
1. [ ] Chrome/Edge ✅
2. [ ] Firefox
3. [ ] Safari (if Mac available)

**Dark Mode:**
1. [ ] Toggle dark mode
2. [ ] All badges readable
3. [ ] Contrast sufficient
4. [ ] Cards look good

## 🎓 Features to Test

**As Admin:**
- [ ] Create organization
- [ ] View all organizations
- [ ] See subscription status on each org
- [ ] Delete organization (with confirmation)

**As Owner:**
- [ ] View my organizations
- [ ] See pending status
- [ ] Subscribe successfully
- [ ] View subscription details
- [ ] See payment history
- [ ] View next billing date

**As Member/Provider:**
- [ ] View organizations I'm part of
- [ ] See org status (but can't subscribe)
- [ ] View subscription details (read-only)

## 📈 Performance Testing

**Load Time:**
- [ ] Dashboard loads in < 2 seconds
- [ ] Subscription data loads in < 1 second
- [ ] No unnecessary API calls

**Network:**
- [ ] Check Network tab in browser
- [ ] Verify only 2 API calls on page load:
  1. /api/organizations/my-organizations
  2. /api/subscriptions/my-subscriptions
- [ ] No duplicate calls

## 🔒 Security Testing

**Authorization:**
- [ ] Can't view other user's subscriptions
- [ ] Can't subscribe to organization you don't own
- [ ] Can't view subscription for org you're not member of

**Test:**
```bash
# Try to access another user's subscription (should fail)
curl -X GET http://localhost:3000/api/subscriptions/organization/WRONG_ORG_ID \
  -H "Cookie: ..."
```

**Expected:** 403 Forbidden

## 📝 Success Criteria

All these should be true:

✅ Password login works  
✅ Dashboard loads without errors  
✅ Organizations display correctly  
✅ Subscribe button redirects to Polar  
✅ Payment completes successfully  
✅ Webhook received and processed  
✅ Signature verified (if configured)  
✅ Subscription record created in database  
✅ Payment record created in database  
✅ Organization enabled in database  
✅ Dashboard shows "Active" status  
✅ Subscription details expandable  
✅ Payment history visible  
✅ Quick stats accurate  
✅ Success toast appears  
✅ URL cleaned after redirect  
✅ No console errors  
✅ Mobile responsive  

## 🎉 Ready for Production When:

- [ ] All sandbox tests pass
- [ ] Production credentials configured
- [ ] Production webhook tested
- [ ] Real payment tested
- [ ] Email notifications working
- [ ] Error handling verified
- [ ] Security tested
- [ ] Performance acceptable
- [ ] Documentation reviewed
- [ ] Backup strategy in place

## 📚 Reference Documentation

Quick reference for testing:

1. **[COMPLETE_SUBSCRIPTION_IMPLEMENTATION.md](./COMPLETE_SUBSCRIPTION_IMPLEMENTATION.md)** - Full overview
2. **[WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)** - Webhook configuration
3. **[ENHANCED_DASHBOARD_FEATURES.md](./ENHANCED_DASHBOARD_FEATURES.md)** - Dashboard guide
4. **[SUBSCRIPTION_DATABASE_SCHEMA.md](./SUBSCRIPTION_DATABASE_SCHEMA.md)** - Database reference
5. **[POLAR_API_TROUBLESHOOTING.md](./POLAR_API_TROUBLESHOOTING.md)** - Troubleshooting

## 🎯 Next Testing Priorities

1. **Create another organization** - Test multiple subscriptions
2. **Cancel a subscription** - Test cancellation webhook
3. **Test as different user** - Verify authorization
4. **Test payment failure** - How system handles errors
5. **Test webhook retry** - If Polar resends failed webhooks

## 💡 Monitoring Tips

**During Testing, Watch For:**

**Server Logs:**
```bash
# Good signs:
✅ Checkout session created
✅ Webhook signature verified
✅ Organization enabled
💳 Subscription created
💰 Payment recorded

# Bad signs:
❌ Polar API Error
❌ Invalid webhook signature
❌ Error processing webhook
```

**Browser Console:**
```bash
# Good signs:
✅ No errors
✅ API calls succeed (200 status)
✅ Data loads properly

# Bad signs:
❌ Failed to fetch
❌ 401/403 errors
❌ React errors
```

**Database:**
```sql
-- Monitor tables during testing
SELECT COUNT(*) FROM subscription;
SELECT COUNT(*) FROM payment;
SELECT COUNT(*) FROM organization WHERE enabled = true;
```

## 🔄 Regression Testing

After making changes, re-test:

1. [ ] Login/Logout still works
2. [ ] Admin features still work
3. [ ] Dashboard loads
4. [ ] Subscriptions display
5. [ ] Webhook processes correctly

## 📊 Test Results Template

Use this to track your testing:

```
Test Date: _______________
Tester: _______________
Environment: [ ] Sandbox [ ] Production

✅ PASS | ❌ FAIL | Test Name
─────────────────────────────────
   [ ]        Full Subscription Flow
   [ ]        Subscription Details View
   [ ]        Quick Stats Display
   [ ]        Multiple Organizations
   [ ]        Webhook Signature Verification
   [ ]        API Endpoints
   [ ]        Edge Cases
   [ ]        Loading States
   [ ]        Success URL Redirect
   [ ]        Error Handling
   [ ]        Database Verification
   [ ]        Email Notifications

Notes:
_________________________________
_________________________________
```

Happy testing! Let me know if you encounter any issues! 🚀

