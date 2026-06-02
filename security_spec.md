# IndieBrotherhood Security Specification

## 1. Data Invariants
- A user can only modify their own profile.
- Administrative fields like `credits`, `level`, and `subscriptionTier` are immutable for the user unless explicitly allowed via specific actions or earned through system-verified events (like awarding points).
- Tracks can only be submitted by signed-in users.
- Judgments can only be cast by users who are NOT the track owner.
- Sentinel logs and notifications are primarily authored by the Admin.
- Sub-collections (like judgments) must stay atomically linked to their parent tracks.

## 2. The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Attempt to update `users/other_user_id` with `credits: 999999`.
2. **Privilege Escalation**: Attempt to update own profile with `subscriptionTier: 'legacy'`.
3. **Ghost Field Injection**: Attempt to write to `tracks/track_id` with an undocumented field `isVerifiedByAdmin: true`.
4. **ID Poisoning**: Attempt to create a document with a 2MB string as the document ID.
5. **Self-Judgment**: Attempt to write to `/tracks/{my_track}/judgments/{my_uid}` with a perfect score.
6. **Relational Sync Bypass**: Attempt to create a judgment for a `trackId` that does not exist in the parent collection.
7. **Terminal State Lockdown Bypass**: Attempt to update a track score after its `status` has been moved to `judged`.
8. **PII Leakage**: Attempt to read the entire `/users` collection without a specific `uid` filter.
9. **Timestamp Forgery**: Attempt to create a message with a `createdAt` set to 2 hours in the future.
10. **Shadow Key Update**: Attempt to update a user's `badges` array by appending a value directly without matching the entire validated object shape.
11. **Admin Impersonation**: Attempt to write to `/notifications` as a standard user.
12. **DDoS Resource Exhaustion**: Attempting to query the entire `/tracks` collection without a `limit()` or `where()` clause that matches the owner.

## 3. Deployment Coordinates
- **Project ID**: `indiebrotherhood-2026`
- **Database**: `(default)` (assumed in us-west1)
- **Region**: `us-west1`
