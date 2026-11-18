# ECO-POINT-8 — Firebase Migration

## Migration workspace

- Source repository: `khabenassaif/ECO-POINT-8`
- Source branch: `main`
- Isolated migration branch: `firebase-migration`
- Live source application: `https://eco-point.hatchable.site`
- Live source version audited: Hatchable version 28
- Target: Firebase Authentication, Cloud Firestore, Cloud Storage, Cloud Functions, and Firebase Hosting

Do not modify or disable the live Hatchable deployment during migration. Firebase must be validated independently before DNS or user traffic is switched.

## Source-of-truth warning

The GitHub export is behind the live Hatchable project. The live project currently has 56 files and 20 API functions. Its current files and database schema must be treated as the source of truth; do not overwrite them with the older GitHub export.

## Functional inventory to preserve

- Public landing and information pages
- Member sign-in and sign-out
- Google sign-in and email-based sign-in
- Optional member passkey flow (must be explicitly evaluated; do not silently claim it is migrated)
- Member profile and dashboard
- Waste report submission with photo, GPS coordinates, accuracy, and capture timestamp
- Duplicate-photo and submission-frequency checks
- Automated check history and member report detail
- Admin shared-code sign-in, rate limiting, secure session, and sign-out
- Admin report inbox, report detail, photo review, and atomic approve/reject decisions
- One-time point award, point ledger, and member notification on review
- Reward catalog and reward image upload
- Reward redemption with idempotency, stock protection, and point deduction
- Redemption state transitions, stock restoration/refund, and notifications
- Spin Wheel voucher purchase, one-time voucher consumption, prize selection, stock decrement, redemption, and notification
- Leaderboard, notifications, and activity history
- Admin overview, analytics, categories, locations, rewards, institutional email domains, students, and point transactions

## Source database audit (read-only)

The live PostgreSQL schema contains 19 application tables.

| Table | Rows at audit |
|---|---:|
| users | 3 |
| eco_profiles | 0 |
| waste_reports | 0 |
| automated_checks | 24 |
| admin_reviews | 4 |
| admin_otp_challenges | 3 |
| admin_otp_sessions | 0 |
| eco_admin_credentials | 1 |
| eco_admin_code_sessions | 6 |
| eco_admin_login_attempts | 7 |
| notifications | 0 |
| point_transactions | 0 |
| redemptions | 0 |
| rewards | 8 |
| spin_vouchers | 0 |
| wheel_spins | 0 |
| waste_bins | 0 |
| waste_categories | 5 |
| allowed_email_domains | 0 |

All four existing admin review records and all 24 automated checks reference report IDs that are not present in the current `waste_reports` table. Preserve these as legacy/orphan audit records in a separate archive collection; do not fabricate parent reports.

The 8 reward records currently have no associated image keys. There are no current waste reports, redemptions, point transactions, or user notifications to copy. Keep IDs stable for imported documents.

## Proposed Firebase architecture

- Firebase Authentication: email sign-in and Google provider; preserve legacy user IDs as Firebase UIDs where supported. No password hashes are available in the source application database, so accounts that rely on passwords may need a password-reset or email-link sign-in on first Firebase login.
- Cloud Firestore: collections corresponding to the source tables, retaining source IDs and timestamps.
- Cloud Storage: report and reward images; all access mediated by authenticated Cloud Functions and short-lived signed URLs.
- Cloud Functions (2nd gen): one Express API preserving the existing `/api/**` contracts, with server-side Firebase Admin SDK access.
- Firebase Hosting: serve the existing static UI and rewrite `/api/**` to the Cloud Functions API.
- Firestore and Storage Security Rules: deny direct client reads/writes to private application records and uploads; server functions validate all operations.
- Firestore transactions: protect report review, point awards, redemption, stock changes, voucher use, refunds, and notification creation from duplicate or partial writes.

## Migration safety requirements

1. Keep the Hatchable production site and database unchanged until Firebase passes acceptance tests.
2. Export and verify every persistent source record before cutover; record per-collection counts and stable source IDs.
3. Do not migrate active admin session tokens or login-attempt state. Force a fresh admin login after cutover; migrate the salted PBKDF2 verifier only through a secure server-side secret/configuration path.
4. Keep orphan audit records in a separate archive collection with their original IDs and source table names.
5. Test member/public/admin authorization boundaries, report upload, GPS, duplicate checks, atomic approval, point balance, notification, redemption, cancellation/refund, and Spin Wheel before cutover.
6. Do not publish Firebase configuration with private service-account keys or admin secrets. Use managed runtime credentials and Firebase/Google Secret Manager for secrets.
7. Do not switch the live domain or retire Hatchable until the owner confirms acceptance.

## Deployment gate

A Firebase project and connected Firebase tooling are required to create or select the target project, enable services, apply security rules, deploy Functions/Hosting, and verify the live Firebase endpoints. This branch is a safe workspace; the live application remains unchanged until those steps are completed.
