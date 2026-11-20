# ECO-POINT-8 — Vercel / Neon (Preview)

**Status:** frontend preview deployed; backend not yet connected to Neon. This is **not** a production-ready app. No student accounts, point balances, or reports have been migrated from Hatchable.

- Project: `eco-point-8-preview`
- Source branch: `migration/vercel-neon`
- Target: Vercel Preview; do not promote to Production until smoke tests pass.

## Provisioning

1. In Vercel project **Storage**, install **Neon Postgres** from Marketplace and select **Free** where available. Connect it to the project **Preview** environment. Provider onboarding, account consent, and any billing confirmation must be completed by the owner; never enable a paid plan without explicit approval.
2. Verify that Vercel Environment Variables includes `DATABASE_URL` for **Preview**. This connection variable is private; never add it to GitHub or paste it in public chats.
3. Add the following environment variables as **encrypted** Preview values, directly in Vercel: `SESSION_SECRET` (random, at least 32 characters), `ADMIN_ACCESS_CODE` (private, at least 12 characters), and `EMAIL_FROM` with **either** `RESEND_API_KEY` **or** the SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`). A verified sender is required for real OTP delivery.
4. Set `MAX_UPLOAD_MB` optionally (default 8). Never publish credentials or store secrets in repo files.

## Initialize the database (one time, manually)

The Vercel API does **not** run SQL migrations at startup, by design. Before enabling students to use the application, open a trusted local shell/CI runner with private Preview database credentials and run:

```sh
npm install
ECO_POINT_DB_MIGRATE=YES npm run db:migrate
```

The command requires `DATABASE_URL`, `SESSION_SECRET`, and `ADMIN_ACCESS_CODE` already present in its **process environment**. Do not use the sample values from `.env.example`. The migration runner will not start unless `ECO_POINT_DB_MIGRATE=YES` is explicitly set; it records completed SQL files in `eco_schema_migrations`. Review migration SQL and back up any existing schema/data before applying.

After migration and environment configuration, create a **new Preview deployment** (old deployments will not automatically use newly connected environment variables).

## Validation checklist

- `GET /login` should return HTTP 200 and serve the real login page.
- `GET /healthz` should return `{"ok":true,...}`; HTTP 503 means DB is missing/unreachable.
- `GET /api/public/catalog` should return the database catalog, not fake/sample records.
- Test a genuine login email with the configured sender, login logout, admin code login and logout.
- Test report submission with an image, admin approval/rejection, exactly-once point credit, redemption stock and vouchers.
- Audit all access controls and rate limits. Existing Hatchable reports and balances are **not** synchronized; plan a separate private import/reconciliation before student use.

Current Vercel/Neon version supports email OTP only. **Google sign-in and passkeys have not been migrated.** Vercel Hobby and Neon Free have resource limits; monitor them and do not opt into paid usage without the account owner's approval. Avoid storing large photos as PostgreSQL `bytea` for sustained usage.
