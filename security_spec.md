# Security Specification: Smart QR Studio SaaS Datastore

## 1. Data Invariants

1. **Self-Ownership of Assets (Identity Control):**
   - A QR Code document cannot be created with an `ownerId` different from the authenticated user's `uid`.
   - Users cannot update or delete QR Code configurations created by other users.
   - Anyone (anonymous or signed in) can read a QR Code document if they scan it on the ground to fetch the target redirect URL.

2. **Telemetry integrity (Immutability & Size limits):**
   - Telemetry scan log operations (`create`) are write-only. They cannot be updated or deleted once written.
   - Anyone (even unauthenticated clickers) can append a `Scan` log document inside the collection of a valid `qrcodes/{qrId}` to register their scan telemetry.
   - Scan records have strict field validations (e.g., max string dimensions) to avoid wallet depletion from junk payloads.

3. **Temporal Validity:**
   - Scan records and newly configured QR Codes must record timestamps strictly equal to the server's clock `request.time`.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious payloads designed to violate system safety, proving that the rules successfully protect the datastore.

### Attack 1: Identity Spoofing (Save QR as someone else)
```json
// POST /qrcodes/qr_hacker_1
{
  "id": "qr_hacker_1",
  "ownerId": "victim_user_id_123",
  "content": "http://malicious-redirect.com",
  "qrType": "dynamic",
  "color": "#ff0000",
  "bgColor": "#ffffff",
  "createdAt": "request.time"
}
```
*Expected Behavior:* **PERMISSION_DENIED** (Must match `request.auth.uid`).

### Attack 2: Guest Identity Spoofing (Setting empty owner)
```json
// POST /qrcodes/guest_qr
{
  "id": "guest_qr",
  "ownerId": "",
  "content": "http://malicious-redirect.com",
  "qrType": "static",
  "color": "#000000",
  "bgColor": "#ffffff",
  "createdAt": "request.time"
}
```
*Expected Behavior:* **PERMISSION_DENIED** (Must be a non-empty user UID).

### Attack 3: Resource Poisoning (Extremely long Title text)
```json
// POST /qrcodes/too_long_title
{
  "id": "too_long_title",
  "ownerId": "legit_user",
  "content": "https://meena.technology",
  "qrType": "static",
  "title": "A".repeat(10000), 
  "color": "#000000",
  "bgColor": "#ffffff",
  "createdAt": "request.time"
}
```
*Expected Behavior:* **PERMISSION_DENIED** (Title exceeds 128 chars).

### Attack 4: Hijacking Another Professional Asset (Update other's QR code)
```json
// PATCH /qrcodes/victim_qr_id
{
  "content": "https://evil.attacker.site"
}
```
*(Sent from attacker auth)*
*Expected Behavior:* **PERMISSION_DENIED** (User is not the owner of victim_qr_id).

### Attack 5: Shadow Update (Injecting shadow isVerified flag)
```json
// PATCH /qrcodes/my_qr_id
{
  "content": "https://newsite.com",
  "isVerifiedSaaS": true
}
```
*Expected Behavior:* **PERMISSION_DENIED** (`affectedKeys()` has keys outside allowlist).

### Attack 6: Bypass Server Timestamp on Creation
```json
// POST /qrcodes/backdated_qr
{
  "id": "backdated_qr",
  "ownerId": "legit_user",
  "content": "https://meena.technology",
  "qrType": "static",
  "color": "#000000",
  "bgColor": "#ffffff",
  "createdAt": "2020-01-01T00:00:00Z"
}
```
*Expected Behavior:* **PERMISSION_DENIED** (`createdAt` must equal `request.time`).

### Attack 7: Scan Log Modification (Attempting to wipe scan history)
```json
// DELETE /qrcodes/my_qr_id/scans/scan_1
{}
```
*Expected Behavior:* **PERMISSION_DENIED** (`delete` allow is false on Scan subcollection).

### Attack 8: Spoofing Telemetry Counts (Directly editing scan count to 1,000,000)
```json
// PATCH /qrcodes/my_qr_id
{
  "totalScans": 1000000
}
```
*Expected Behavior:* **PERMISSION_DENIED** (Only specific action-triggered increments are allowed).

### Attack 9: Malicious ID Injection (DDoS with junk slug values)
```json
// POST /qrcodes/JUNK_CHARACTERS_#%@!%^&
{
  "id": "JUNK_CHARACTERS_#%@!%^&",
  "ownerId": "legit_user",
  "content": "https://meena.technology",
  "qrType": "static",
  "color": "#000000",
  "bgColor": "#ffffff",
  "createdAt": "request.time"
}
```
*Expected Behavior:* **PERMISSION_DENIED** (ID does not conform to `isValidId()` pattern).

### Attack 10: Anonymous Read Harvesting on Scans Collection
```json
// GET /qrcodes/other_qr_id/scans
{}
```
*Expected Behavior:* **PERMISSION_DENIED** (Scan collection reads are restricted to the QR asset owner).

### Attack 11: Injecting Non-Enum Values to QRType
```json
// POST /qrcodes/bad_enum
{
  "id": "bad_enum",
  "ownerId": "legit_user",
  "content": "https://meena.technology",
  "qrType": "quantum_qr_code",
  "color": "#000000",
  "bgColor": "#ffffff",
  "createdAt": "request.time"
}
```
*Expected Behavior:* **PERMISSION_DENIED** (Must match static/dynamic enum values).

### Attack 12: Updating Immortable Field (Changing original createdAt date)
```json
// PATCH /qrcodes/my_qr_id
{
  "createdAt": "2030-01-01T00:00:00Z"
}
```
*Expected Behavior:* **PERMISSION_DENIED** (createdAt is immutable during update).

---

## 3. The Test Runner Spec

We enforce safety using unit tests against the security spec.

```ts
// firestore.rules.test.ts
// Unit testing verification suite for "Smart QR Studio" Fortressed Rules.
```
