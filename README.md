# Ledger — Family Budget Calculator

A personal finance tracker for families. Monitor monthly cash flow, track financial assets month-over-month, and plan large purchases with optional loan modeling.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?style=flat-square&logo=fastify&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-blue?style=flat-square&logo=postgresql&logoColor=white)

---

## Features

**Monthly snapshots** — each month is a self-contained record. Fixed expenses carry over automatically; one-time expenses don't. Net leftover (income − fixed − one-time) is computed on the fly.

**Asset tracking** — record the value of bank accounts, pension funds, trading accounts, education funds, and more each month. Month-over-month % change is calculated automatically.

**Goals & loans** — plan large purchases with named sections. Attach a loan with principal, term, and annual rate; monthly payments are auto-injected into future snapshots when the goal is activated.

**Multi-currency** — enter amounts in NIS, USD, or EUR. Exchange rates are fetched daily from [frankfurter.app](https://www.frankfurter.app) (free, no API key). Every amount stores both the original value and its NIS equivalent at time of entry.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript, Fastify |
| ORM | Prisma |
| Database | PostgreSQL |
| Frontend | React 18, Vite, Recharts |
| Validation | Zod |
| Scheduling | node-cron |

---

## Project Structure

```
├── src/                    # Backend (Fastify API)
│   ├── config/             # DB, env, currency
│   ├── modules/            # Feature modules (snapshots, income, expenses, assets, goals, currency)
│   ├── utils/              # Loan calculator, snapshot carryover logic
│   ├── jobs/               # Currency sync cron job
│   ├── server.ts
│   └── index.ts
├── frontend/               # React frontend (Vite)
│   └── src/
│       ├── api/            # Typed API client
│       ├── components/     # Layout, Modal
│       └── pages/          # Dashboard, Monthly, Assets, Goals
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── docs/
    ├── architecture.md
    ├── db-schema.md
    └── commands.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL

### Setup

```bash
# 1. Clone and install backend dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your Postgres connection string

# 3. Run database migrations
npm run db:migrate

# 4. Start the backend (port 3000, hot reload)
npm run dev
```

```bash
# In a second terminal — install and start the frontend (port 5173)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string |
| `PORT` | `3000` | Backend port |
| `CURRENCY_API_URL` | `https://api.frankfurter.app` | Exchange rate API base URL |
| `CURRENCY_REFRESH_CRON` | `0 6 * * *` | Rate refresh schedule (daily at 6am) |
| `NODE_ENV` | `development` | `development` / `production` |

---

## API Overview

```
GET  /health

# Snapshots
POST   /snapshots
GET    /snapshots
GET    /snapshots/:id
PATCH  /snapshots/:id/finalize
DELETE /snapshots/:id

# Income & Expenses (nested under snapshot)
POST/GET/PATCH/DELETE  /snapshots/:id/income/:iid
POST/GET/PATCH/DELETE  /snapshots/:id/fixed-expenses/:eid
POST/GET/PATCH/DELETE  /snapshots/:id/one-time-expenses/:eid

# Assets
POST/GET/PATCH/DELETE  /assets/:id
POST   /assets/:id/values
GET    /assets/:id/values
GET    /assets/totals

# Goals & Loans
POST/GET/PATCH/DELETE  /goals/:id
POST/PATCH/DELETE      /goals/:id/loan
POST/GET/PATCH/DELETE  /goals/:id/sections/:sid
POST   /goals/:id/activate
POST   /goals/:id/deactivate

# Currency
GET   /currency/rates
POST  /currency/rates/refresh
GET   /currency/convert?amount=&from=&to=
```

Full schema documentation: [`docs/db-schema.md`](docs/db-schema.md)
Full command reference: [`docs/commands.md`](docs/commands.md)

---

## Design Notes

**No authentication** — built for single-family use. The schema has no `user_id` foreign keys but is structured to support multi-user if needed later.

**Immutable history** — finalized snapshots are never retroactively modified. Exchange rate changes don't affect past records; each entry stores the rate at time of entry.

**Loan injection** — when a goal with a loan is activated, `LoanPayment` records are pre-generated for all future months. As each month's snapshot is created, the relevant payment is injected as a fixed expense automatically.

---

## License

MIT
