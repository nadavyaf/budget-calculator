# Architecture Overview

## What This Is

A REST API backend for a family budget management app. No frontend yet — all interaction is via HTTP endpoints. Built with Node.js + TypeScript, Fastify, Prisma, and PostgreSQL.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js + TypeScript | Type safety, great ecosystem |
| HTTP Framework | Fastify | Faster than Express, built-in JSON schema validation |
| ORM | Prisma | Type-safe DB queries, migration system |
| Database | PostgreSQL | Relational data with complex joins |
| Validation | Zod | Schema validation for request bodies |
| Scheduling | node-cron | Daily currency rate refresh |
| Currency API | frankfurter.app | Free, no API key, supports ILS (NIS) |

## Module Structure

```
src/
  config/
    db.ts          Prisma client singleton (one DB connection shared across app)
    env.ts         Reads + validates environment variables via Zod
    currency.ts    Fetches live exchange rates, caches in DB
  modules/
    snapshots/     Monthly flow hub — creates months, computes leftover
    income/        Income sources within a snapshot
    expenses/      Fixed expenses (carry over monthly) + one-time expenses
    assets/        Financial asset definitions + per-month values
    goals/         Goal/plan CRUD + activation logic
    loans/         Loan math, called internally by goals (no public routes)
    currency/      Exchange rate endpoints
  utils/
    loanCalculator.ts     Amortization formula: monthly payment from principal/rate/months
    snapshotCarryover.ts  Copies fixed expenses from prior month into new snapshot
  jobs/
    currencySync.ts  Cron job — refreshes USD/EUR → NIS rates daily at 6am
  server.ts        Fastify instance setup, plugin registration, route mounting
  index.ts         Entry point — starts server, triggers initial currency fetch
```

## Core Data Flow

### Monthly Flow

```
User creates snapshot (POST /snapshots)
  → system finds last month's snapshot
  → copies all fixed expenses into new month
  → injects any pre-scheduled loan payments as fixed expenses
  → returns new snapshot

User adds income + expenses to snapshot
  → GET /snapshots/:id returns everything + computed leftover:
     leftover = SUM(income) - SUM(fixed expenses) - SUM(one-time expenses)
     (all amounts stored in NIS for consistent math)
```

### Goal + Loan Flow

```
User creates goal (POST /goals)
  → optionally attaches a loan (POST /goals/:id/loan)
  → monthly_payment auto-computed: P × r / (1 − (1+r)^−n)

User activates goal (POST /goals/:id/activate)
  → generates one LoanPayment record per month for N months
  → if a snapshot already exists for that month → also inserts FixedExpense immediately
  → future snapshots automatically pick up the loan payment via carryover
```

### Asset Tracking

```
User defines an asset (POST /assets) — e.g. "Pension Fund", type: PENSION_FUND
User records its value each month (POST /assets/:id/values)
  → stored in native currency + converted to NIS at current rate

GET /assets/:id/values returns history with:
  → change_pct = (this month - last month) / last month × 100
  → change_abs = this month NIS value - last month NIS value

GET /assets/totals?snapshotId= sums all assets for a given month
```

### Currency

```
On startup + daily at 6am:
  → fetch USD → ILS and EUR → ILS from frankfurter.app
  → store in exchange_rates table with timestamp

Every time a user enters a USD or EUR amount:
  → amount_nis = amount × current rate (from DB)
  → both stored — historical records are never retroactively recalculated
```

## Key Design Decisions

**Snapshot-based history** — each month is an immutable `MonthlySnapshot`. Fixed expenses are *copied* into each new month, not referenced. This means editing a past month doesn't affect the current month.

**Computed leftover** — never stored in DB, always calculated fresh on read. Single source of truth.

**Draft mode** — one draft snapshot allowed per calendar month. Lets user simulate changes (e.g. "what if I add this loan?") without affecting real data. Draft is promoted to real via `PATCH /snapshots/:id/finalize`.

**Currency stored dual** — every monetary value keeps both the original `amount`+`currency` and the `amount_nis` (NIS at time of entry). History is stable; current display is always in NIS.

**Single-family, no auth** — designed for one household. DB schema has no `user_id` columns but is structured to add them later without breaking changes.
