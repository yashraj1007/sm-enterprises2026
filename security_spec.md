# Security Specification for Hardware/Software Sync Platform

## 1. Data Invariants
- **Authentication**: Users must be signed in with a verified email to submit support tickets or place orders (unless guest mode is explicitly handled, but here we prefer verified identity).
- **Ownership**: Every sensitive document (`orders`, `queries`, `users`) must be tied to a `userId`. Access is strictly `owner == request.auth.uid`.
- **Admin Supremacy**: Users with the `admin` flag in the `/admins/` collection have full read/write access to all collections for oversight and fulfillment.
- **Immutability**: Fields like `createdAt` and `userId` must not be changed once written.
- **Terminal States**: Orders or Queries marked as `resolved`, `delivered`, or `cancelled` cannot be moved back to `pending` by users.
- **Payload Sanitization**: All strings (especially Base64 evidence) must be strictly size-limited to prevent document bloating attacks.

---

## 2. The "Dirty Dozen" (Red Team Payloads)

### T1: Identity Spoofing (orders)
**Intent**: Create an order for someone else.
```json
{
  "userId": "victim_uid_123",
  "total": 500,
  "status": "pending",
  "createdAt": "2026-04-21T18:00:00Z"
}
```
**Auth**: `{ "uid": "attacker_456" }`
**Expected**: `PERMISSION_DENIED`

### T2: Privilege Escalation (users)
**Intent**: Make myself an admin.
```json
{
  "email": "attacker@gmail.com",
  "role": "admin",
  "createdAt": "2026-04-21T18:00:00Z"
}
```
**Auth**: `{ "uid": "attacker_456" }`
**Expected**: `PERMISSION_DENIED`

### T3: Resource Poisoning (queries - problemImageUrl)
**Intent**: Crash the database or inflate costs with a massive payload.
```json
{
  "name": "Attacker",
  "problemImageUrl": "A".repeat(1024 * 1024 * 2), // 2MB string
  "type": "hardware",
  "status": "pending",
  "createdAt": "2026-04-21T18:00:00Z"
}
```
**Expected**: `PERMISSION_DENIED` (String size limit exceeded)

### T4: Shadow Field Injection (products)
**Intent**: Add unauthorized fields like `isFeatured` or `hiddenDiscount`.
```json
{
  "name": "Laptop Pro",
  "price": 99,
  "status": "active",
  "ghost_field": "unauthorized_data"
}
```
**Expected**: `PERMISSION_DENIED` (Keys mismatch)

### T5: State Shortcut (orders)
**Intent**: Mark my own order as "delivered" without paying.
```json
{
  "status": "delivered"
}
```
**Auth**: `{ "uid": "user_123" }` (on an existing pending order)
**Expected**: `PERMISSION_DENIED` (Users cannot modify status to 'delivered')

### T6: Orphaned Writes (queries)
**Intent**: Create a query without a userId to bypass ownership checks.
```json
{
  "name": "Ghost",
  "type": "software",
  "status": "pending"
}
```
**Expected**: `PERMISSION_DENIED` (Required fields missing)

### T7: ID Poisoning (docId)
**Intent**: Use a malicious/too-long string as a document ID.
**Path**: `/queries/VERY_LONG_GARBAGE_STRING_REPEATED_1000_TIMES`
**Expected**: `PERMISSION_DENIED`

### T8: Admin Impersonation (read)
**Intent**: Read all orders as a standard user.
**Operation**: `list /orders`
**Auth**: `{ "uid": "user_123" }`
**Expected**: `PERMISSION_DENIED` (Only `userId == auth.uid` allowed for list)

### T9: Timestamp Fraud (update)
**Intent**: Change the `createdAt` date to jump ahead in the queue.
```json
{
  "createdAt": "1999-01-01T00:00:00Z"
}
```
**Expected**: `PERMISSION_DENIED` (Field is immutable)

### T10: Data Type Corruption
**Intent**: Send a boolean where a string (phone) is expected.
```json
{
  "phone": true
}
```
**Expected**: `PERMISSION_DENIED`

### T11: PII Leak Attempt
**Intent**: Access someone else's user profile directly.
**Path**: `/users/victim_uid_123`
**Auth**: `{ "uid": "attacker_456" }`
**Expected**: `PERMISSION_DENIED`

### T12: Contact Query Scraping
**Intent**: Read general contact submissions meant for admins.
**Operation**: `list /contact_queries`
**Auth**: `{ "uid": "user_123" }`
**Expected**: `PERMISSION_DENIED`

---

## 3. Test Runner Definition (Verification Plan)
The following file `src/tests/firestore.rules.test.ts` will be used to simulate these attacks using the Firebase Rules Unit Testing library.

```typescript
// Proposed test structure
// 1. Setup Admin environment
// 2. Setup Unauthenticated user
// 3. Setup Authenticated standard user
// 4. Exec T1-T12 and assert error codes
```
