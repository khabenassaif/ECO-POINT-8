# Eco-Point Vercel / Neon preview

Status: **PREVIEW ONLY**. No real records or point balances are migrated. The old Hatchable website is untouched.

Git branch: `migration/vercel-neon`. This branch is based on the PostgreSQL adapter from `migration/render-postgres`.

## What can run now

Vercel Express Functions can serve the existing HTML/CSS/JS site and its bundled assets. When Neon and credentials are not configured, all `/api/*` endpoints deliberately return HTTP 503. This makes the public UI accessible without inventing rewards, users, reports or point balances.

## To enable features later

1. Connect the repository to a Vercel **Hobby** project. Deploy this branch as a *Preview*, not production.
2. Provision **Neon Free** PostgreSQL in Vercel's Storage Marketplace. Never paste the database URL into GitHub.
3. Set **DATABASE_URL**, **SESSION_SECRET** (32+ chars), **ADMIN_ACCESS_CODE** (strong, private), **EMAIL_FROM**, and **RESEND_API_KEY** as protected Vercel environment variables.
4. **Before enabling the API**, explicitly run the database bootstrap SQL for this branch with a trusted job/secure SQL session. Vercel Functions intentionally do not run migrations at import or on each request.
5. Validate live public catalog, email login, admin login, report photo uploads, report approval and point ledger, redemption and stock limits, and responsive layout. Reconcile data exported privately from Hatchable before inviting real students.
6. Only after acceptance decide whether to merge to production.

The previous Render-only scripts continue to exist for local integration testing. The no-database preview must never be used for real reports.

For larger usage, use external object storage instead of storing student photos in PostgreSQL bytea. Monitor Vercel Hobby limits; Hobby usage is intended for personal/noncommercial work.
