# Test Cases for Fixed Issues

## Test Case 1: Staff Register Endpoint

### Setup
- Login as super_admin user
- Navigate to `/dashboard/settings`
- Click on "Staff" tab

### Test Steps
1. Fill in the form:
   - Email: `test.pharmacist@example.com`
   - Password: `SecurePass123!`
   - First Name: `Test`
   - Last Name: `Pharmacist`
   - Role: `pharmacist_tech`
2. Click "เพิ่ม Staff" button

### Expected Result
- ✅ Success message: "เพิ่ม Staff สำเร็จ"
- ✅ Form clears after submission
- ✅ New staff can login with the credentials
- ✅ API logs show: `POST /v1/auth/staff-register 201`

### Error Cases to Test
- Duplicate email → "อีเมลนี้ถูกใช้งานแล้ว"
- Empty email/password → "กรุณากรอก Email และ Password"
- Non-super_admin user → 403 Forbidden

---

## Test Case 2: Inbox Page - Null Date Handling

### Setup
- Create a chat session with `updatedAt = null` in database:
```sql
UPDATE chat_sessions SET updated_at = NULL WHERE id = 'test-session-id';
```

### Test Steps
1. Navigate to `/dashboard/inbox`
2. Observe the sessions list

### Expected Result
- ✅ Page loads without crash
- ✅ Session with null `updatedAt` shows "-" instead of date
- ✅ Other sessions show formatted date: "14:30 1 เม.ย."
- ✅ No console errors

### Before Fix
- ❌ Page crashes with: `Invalid Date` error
- ❌ Console shows: `toLocaleString() called on Invalid Date`

---

## Test Case 3: Dashboard Page - Null Amount Handling

### Setup
- Create an order with `total_amount = null` in database:
```sql
UPDATE orders SET total_amount = NULL WHERE id = 'test-order-id';
```

### Test Steps
1. Navigate to `/dashboard`
2. Scroll to "ออเดอร์ล่าสุด" section
3. Observe the order list

### Expected Result
- ✅ Page loads without crash
- ✅ Order with null `totalAmount` shows "฿0.00"
- ✅ Other orders show formatted amount: "฿1,250.00"
- ✅ No console errors

### Before Fix
- ❌ Page crashes with: `NaN.toLocaleString()` error
- ❌ Console shows: `Cannot convert NaN to locale string`

---

## Test Case 4: Settings Save - LINE Configuration

### Setup
- Login as super_admin
- Navigate to `/dashboard/settings`
- Click on "LINE" tab

### Test Steps
1. Modify Channel ID field: `1234567890`
2. Click "บันทึก" button
3. Wait for response
4. Refresh the page

### Expected Result
- ✅ Success message: "บันทึกการตั้งค่า LINE สำเร็จ"
- ✅ API request: `PATCH /v1/system/config/integrations/line`
- ✅ Request includes auth token in header
- ✅ After refresh, field shows updated value
- ✅ Badge shows "DB" (not "ENV")

### Network Tab Verification
```
Request Headers:
  Authorization: Bearer eyJhbGc...
  Content-Type: application/json

Request Body:
  { "channelId": "1234567890" }

Response:
  { "data": { "channelId": "1234567890" }, "meta": {} }
```

---

## Integration Test: Full Workflow

### Scenario: New Staff Member Registration & First Login

1. **Super Admin Creates Staff**
   - Login as super_admin
   - Go to Settings → Staff
   - Create new pharmacist: `john.doe@pharmacy.com`
   - Password: `Pharmacy2024!`

2. **New Staff Logs In**
   - Logout from super_admin
   - Login as `john.doe@pharmacy.com`
   - Verify dashboard loads

3. **Staff Views Inbox**
   - Navigate to Inbox
   - Verify sessions list loads (even with null dates)
   - Select a session
   - Send a test message

4. **Staff Views Dashboard**
   - Navigate to Dashboard
   - Verify stats load
   - Verify recent orders show (even with null amounts)
   - Click on an order

### Expected Result
- ✅ All pages load without crashes
- ✅ No console errors
- ✅ All data displays correctly
- ✅ Null values handled gracefully

---

## Performance Test

### Load Test: Inbox with 100 Sessions
```javascript
// Create 100 sessions, 50% with null updatedAt
for (let i = 0; i < 100; i++) {
  const updatedAt = i % 2 === 0 ? null : new Date();
  // Insert session...
}
```

### Expected Result
- ✅ Page loads in < 2 seconds
- ✅ No memory leaks
- ✅ Smooth scrolling
- ✅ All 100 sessions render correctly

---

## Browser Compatibility

Test on:
- ✅ Chrome 120+
- ✅ Firefox 120+
- ✅ Safari 17+
- ✅ Edge 120+

All fixes use standard JavaScript (no experimental features).

---

## Regression Test Checklist

After deployment, verify these pages still work:

- [ ] `/dashboard` - Dashboard overview
- [ ] `/dashboard/inbox` - Chat inbox
- [ ] `/dashboard/orders` - Order list
- [ ] `/dashboard/patients` - Patient list
- [ ] `/dashboard/pharmacist` - Prescription queue
- [ ] `/dashboard/settings` - All settings tabs
- [ ] `/dashboard/products` - Product catalog
- [ ] `/dashboard/inventory` - Stock management
- [ ] `/dashboard/reports` - Analytics

---

## Monitoring

### Logs to Watch
```bash
# API logs
docker logs telepharmacy-api --tail 100 -f | grep -i "staff-register\|error"

# Admin logs (if using PM2)
pm2 logs telepharmacy-admin --lines 100
```

### Metrics to Track
- Error rate (should be 0 for these pages)
- Page load time (should be < 2s)
- API response time (should be < 500ms)

---

## Rollback Plan

If issues occur:

1. **Immediate Rollback**
   ```bash
   git revert HEAD
   pnpm build
   docker compose up -d --build
   ```

2. **Partial Rollback**
   - Revert specific file: `git checkout HEAD~1 -- apps/admin/src/app/dashboard/inbox/page.tsx`
   - Rebuild: `pnpm build`
   - Redeploy: `docker compose up -d --build telepharmacy-admin`

3. **Database Rollback**
   - No database changes were made, so no rollback needed

---

## Success Criteria

All tests pass when:
- ✅ Staff register endpoint returns 201
- ✅ Inbox page loads with null dates
- ✅ Dashboard page loads with null amounts
- ✅ Settings save successfully
- ✅ No console errors
- ✅ No API errors in logs
- ✅ All builds successful
- ✅ All diagnostics clean
