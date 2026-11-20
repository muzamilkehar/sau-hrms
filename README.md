# SAU HR Portal

Employee management for The Shaikh Ayaz University, Shikarpur. Same SAU template and stack as the ERP project
(Next.js 16, TypeScript, Tailwind, PostgreSQL, Prisma, Better Auth), reduced to two roles.

| Role | What they can do |
| --- | --- |
| **HR/Admin** | Dashboard (employees, present today, pending leave, recent activities) · Employee directory with search by email or employee ID, add/edit/deactivate employees, reset passwords · Attendance records of everyone with from/to dates and status filter (All, Present, Absent, Half-Day, Leave) · Leave approvals (approve or reject with optional remarks; filter All/Pending/Approved/Rejected) · Payroll (basic, HRA, allowances, deductions, net) |
| **Employee** | Dashboard with recent activity · My profile (editable contact details, photo, job details, salary summary, documents) · Attendance (check in / check out, history) · Leave (Paid, Unpaid, Sick) with a monthly calendar (approved green, pending yellow, rejected red) and full history · Salary (own, view only) |

## Run it on your computer

Requirements: Node.js 22 (20.19+ works) and a PostgreSQL database. The easiest database is a free **Neon** project (neon.tech); Docker is optional.

```powershell
npm install
Copy-Item .env.example .env       # then edit .env (see below)
npm run db:setup                  # creates the tables, the HR/Admin account and demo data
npm run dev                       # http://localhost:3000
```

Edit `.env`:

1. `DATABASE_URL` : your Neon **pooled** connection string. `DIRECT_URL` : the Neon **direct** string (the same without `-pooler` in the host). Remove `&channel_binding=require` if present.
2. `BETTER_AUTH_SECRET` : generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
3. `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` : choose strong passwords (12+ characters, letters, numbers and symbols, not containing the person's name or email name).
4. Leave `SEED_DEMO_DATA="true"` for a ready demo, or set it to `"false"` for an empty system with only the HR/Admin account.

Sign in:

| Account | Email | Password |
| --- | --- | --- |
| HR/Admin | `SEED_ADMIN_EMAIL` (default `hr@saus.edu.pk`) | `SEED_ADMIN_PASSWORD` |
| Demo employees | `ayesha.khan@`, `bilal.ahmed@`, `maryam.memon@`, `imran.shaikh@` + `saus.edu.pk` | `SEED_DEMO_PASSWORD` |

Emails (password reset) are printed in the terminal until you set `RESEND_API_KEY`.

## How accounts work

HR creates every account (Employee Directory > Add employee). The system generates the employee ID (EMP001...) and a temporary password that is shown **once**.
The employee must choose their own password at first sign-in. HR can reset a password, unlock an account or deactivate a leaver (signed out immediately).

## Rules built in (change them in one place)

| Rule | Where |
| --- | --- |
| Weekly off = Saturday and Sunday | `src/lib/dates.ts` (`WEEKLY_OFF`) |
| 6 hours between check-in and check-out = Present, less = Half-Day | `src/modules/attendance/rules.ts` (`FULL_DAY_HOURS`) |
| Absent = a past working day with no check-in and no approved leave; Leave = approved leave day | `src/modules/attendance/rules.ts` |
| Leave: weekends not counted, max 30 days per request, up to 7 days back-dated, no overlap with pending/approved requests | `src/modules/leave/rules.ts` |
| Net pay = basic + HRA + allowances - deductions (whole PKR) | `src/modules/payroll/rules.ts` |
| Uploads: PDF/PNG/JPG/WebP checked by content, documents up to 4 MB, photo up to 1 MB | `src/modules/documents/rules.ts` |
| Times and dates use Pakistan time (Asia/Karachi) | `src/lib/dates.ts` |

## Security

Argon2id passwords with a 12-character policy and breach check · lockout after 5 failed sign-ins (15 minutes) · rate limiting · 30-minute idle / 12-hour session limits ·
HTTP-only cookies, CSRF origin checks, nonce-based Content-Security-Policy and security headers · every page, action and file download checks the role on the server ·
employees can only ever read their own salary, documents and photo · payroll changes are logged with before/after values · no public sign-up.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build, serve |
| `npm run typecheck` / `lint` | TypeScript and ESLint |
| `npm test` | Unit tests (no database) |
| `npm run test:integration` | Integration tests (needs `TEST_DATABASE_URL`, a database whose name contains `test`; it is emptied!) |
| `npm run smoke` | End-to-end check of a running app (see header of `scripts/smoke.mjs`) |
| `npm run db:setup` / `db:migrate` / `db:seed` | Migrate and seed |

## Deploy to Vercel

1. Push to a **private** GitHub repository (`.env` is git-ignored) and import it in Vercel.
2. Environment variables: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your https domain), `RESEND_API_KEY`, `EMAIL_FROM`, and the Upstash pair for shared rate limiting. Use a separate Neon branch for Preview deployments.
3. Build command: `npm run vercel-build` (applies migrations, then builds).
4. Create the first HR/Admin once from your computer: `DATABASE_URL=<production url> npm run db:seed` with `SEED_DEMO_DATA=false`.

## Notes and limits

- Files are stored in the database (simple and private). Vercel accepts request bodies up to 4.5 MB, hence the 4 MB document limit.
- The initial migration SQL was written by hand to match `prisma/schema.prisma` and tested on PostgreSQL 16. If `npm run db:migrate:dev` reports a difference, tell the developer.
- The activity feed is not tamper-proof like the ERP audit log; if you need that, port the append-only trigger from the ERP project.
- Not included on purpose: leave balances/quotas, holidays calendar, payslip history, two-factor authentication.
