# CultTwenty Outbound

CultTwenty's internal AI-powered outbound sales engine — find high-value B2B
leads, research and score them, generate grounded personalized outreach,
review and approve everything as a human, then send and track it.

Workflow: **Research → Qualify → Score → Generate → Human Review → Approve →
Send → Track → Follow up.** Nothing ever sends without a human approving it
first; automated follow-ups only continue a sequence a human already
approved.

## Tech stack

- **Frontend:** Next.js 16 (App Router, Turbopack), TypeScript (strict), Tailwind CSS v4, shadcn/ui-style components, Framer Motion-ready
- **Backend:** Next.js Route Handlers, PostgreSQL, Prisma ORM
- **Auth:** Auth.js (NextAuth v5), single-admin credentials login, JWT sessions
- **AI:** OpenAI (optional) with a fully deterministic Mock Mode fallback — the whole app works with zero API cost
- **Email:** Provider-abstracted (Resend / SendGrid / SMTP / Mock)

## 1. Environment variables

Copy `.env.example` to `.env` and fill in what you need. Everything not set
falls back to a safe default (Mock AI, Mock email, Demo lead discovery), so
the app runs end-to-end with **zero external services configured**.

| Variable | Required? | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `AUTH_SECRET` | **Yes** | Signs session cookies — generate with `openssl rand -base64 32` |
| `AUTH_URL` | **Yes** (prod) | Public base URL of the deployed app; used to build the pitch-tracking link embedded in emails |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Yes, once | Used only by `npm run db:seed` to create the first admin user |
| `OPENAI_API_KEY` | No | Enables live AI research summaries, scoring rationale, and email copy. Without it, the app runs in **AI Mock Mode** — deterministic, template-based logic grounded in the same facts, so every workflow step is fully testable for free. |
| `EMAIL_PROVIDER` | No (default `mock`) | `mock` \| `resend` \| `sendgrid` \| `smtp` |
| `RESEND_API_KEY` / `SENDGRID_API_KEY` / `SMTP_*` | Only for the provider you pick | Provider credentials |
| `INBOUND_WEBHOOK_SECRET` | For reply/bounce tracking | Shared secret for the inbound webhooks (see §3) |
| `LEAD_DISCOVERY_PROVIDER` | No (default `demo`) | `demo` \| `custom` — see §2 |
| `CRON_SECRET` | For production sending | Authenticates the scheduled job that dispatches queued emails/follow-ups |

API keys are **never** sent to the browser or stored in the database — every
AI and email call happens server-side, reading credentials from environment
variables only.

## 2. Data sources integrated

- **Lead discovery ("Find Leads"):** ships with a **Demo provider** — 24
  clearly fictional companies (`isDemo: true` end-to-end) spanning the
  target industries, so the whole find → research → score → generate →
  approve → send workflow is explorable immediately. To go live, implement
  a real provider in `src/lib/discovery/providers/` against a data source
  you're licensed to use (a company-search API, a CRM export, etc.),
  register it in `src/lib/discovery/registry.ts`, and set
  `LEAD_DISCOVERY_PROVIDER=custom`.
- **Company research:** fetches each lead's public homepage over HTTPS
  (respecting `robots.txt`, identifying itself via User-Agent, homepage
  only — no crawling, no login-gated content), extracts factual signals
  (meta description, headings, HTTPS, social links) and detects trigger
  keywords (launch, campaign, rebrand, expansion, funding, hiring, …).
  Every fact is stored with its source URL and a confidence level. If a
  website can't be fetched, that lead simply has fewer facts — nothing is
  invented to fill the gap.
- **CSV import** (`Leads → Import CSV`): columns `company, website,
  industry, contact_name, contact_role, email, linkedin, country, notes`.
  Imported rows are real, user-supplied data — treated the same as any
  other lead.

## 3. Configuring email sending

1. **Settings → Providers**: pick `resend`, `sendgrid`, or `smtp`, and set
   the matching environment variables (`RESEND_API_KEY`, `SENDGRID_API_KEY`,
   or `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`). Leave it on
   `mock` for local dev — it logs the send and marks it delivered without
   any network call, so demos and testing are always safe.
2. **Settings → Sender & Pitch**: set the sender name/email, reply-to, pitch
   URL, and default signature.
3. **Sending limits** (Settings, or per-campaign): a window
   (e.g. 09:00–17:00), allowed days, a max sends/day cap, and a randomized
   delay between sends. Real sending is never a burst — every queued email
   gets a scheduled timestamp computed from these limits.
4. **Dispatch loop**: queued emails and due follow-ups are sent by
   `POST /api/cron/process`, authenticated via
   `Authorization: Bearer $CRON_SECRET`. `vercel.json` wires this to Vercel
   Cron (every minute) — on another host, point any scheduler at that route
   with the same header. Nothing sends without this loop running.
5. **Inbound replies / bounces** (optional but recommended): point your
   provider's inbound-parse and event webhooks at
   `POST /api/inbound/email?secret=$INBOUND_WEBHOOK_SECRET` (replies) and
   `POST /api/inbound/events?secret=$INBOUND_WEBHOOK_SECRET` (delivered /
   opened / bounced / complained), adapting field names in your provider's
   dashboard to the documented JSON shape in each route handler. Without
   this wired up, you can still log replies manually from a lead's Replies
   tab — they get the same AI analysis.

**Demo leads can never be emailed.** The send guard
(`src/lib/sending/guard.ts`) hard-blocks any message to a lead flagged
`isDemo`, independent of anything the UI allows — verified even for a fully
approved, compliance-confirmed campaign.

## 4. Creating your first campaign

1. **Find Leads** (Dashboard or Leads page) — set country/industry/size/
   keyword criteria and a lead count. Leads are created and queued for
   research; a progress dialog shows live status until every one is
   researched and scored.
2. **Review** the Leads page (card or Pipeline/Kanban view) — filter by
   score, reject anything irrelevant, open a lead to see its full research,
   score breakdown, and set an opportunity value.
3. Select the qualified leads you want to contact and click **Generate
   Outreach** (or **Build Outbound Campaign** from the dashboard for a
   named campaign with audience filters instead of a manual selection).
4. On the campaign page: **Step 02–03** generates three email variants per
   lead (direct / creative / consultative), each individually grounded in
   that lead's research — never the same email twice.
5. **Step 04 — Review**: read each draft (subject, body, quality-check
   badges for factuality/personalization/length/tone/CTA/spam), edit,
   regenerate, or switch variants, then **Approve** individually or
   **Approve All**.
6. **Step 05 — Send**: set the schedule, confirm the compliance checklist
   (§5), and click **Send Campaign**. Approved messages are queued with
   scheduled timestamps; the dispatch loop (§3.4) sends them as their time
   arrives. Replies auto-stop that lead's follow-ups; a bounce or
   unsubscribe suppresses the address permanently, everywhere.

## 5. Compliance checklist before a live send

Every campaign requires explicit confirmation, on the Send step, that:

- Contact data was sourced from lawfully accessible sources only
- The campaign complies with applicable email marketing law (GDPR / UWG / CAN-SPAM, as applicable)
- Opt-outs and unsubscribe requests will be respected immediately
- No private (non-business) contact details are being used
- No misleading claims are made in the campaign's messaging
- Only individually reviewed and approved leads will be contacted

The app supports this technically rather than working around it: a global
suppression list (Settings → Suppression) blocks any suppressed address
forever; every unsubscribe or spam-complaint reply is auto-detected and
suppressed immediately; demo leads are hard-blocked from ever being
emailed; and nothing sends without going through the approval gate above.

## Local development

```bash
cp .env.example .env        # fill in DATABASE_URL at minimum
npm install
npm run db:push             # create the schema
npm run db:seed             # creates the admin user + 24 demo leads
npm run dev
```

Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`.

Other scripts: `npm run db:studio` (Prisma Studio), `npm run build` /
`npm run start` (production), `npm run lint`.

## Project structure

```
prisma/schema.prisma       Full data model (users, companies, contacts, leads,
                            research, scores, campaigns, emails, events,
                            replies, followups, opportunities, suppression,
                            settings, activity_log)
src/lib/                   Business logic: AI, research, scoring, discovery,
                            email generation/sending, follow-ups, replies
src/app/api/                Route handlers (all business endpoints)
src/app/(app)/               Authenticated pages (dashboard, leads, campaigns, …)
src/components/            UI, organized by feature
```
