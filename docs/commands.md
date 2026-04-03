# Commands Reference

## Prerequisites

- Node.js 20+
- PostgreSQL running locally (or via Docker)
- Copy `.env.example` → `.env` and fill in your `DATABASE_URL`

---

## First-Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your Postgres connection string
cp .env.example .env

# 3. Create DB tables from schema (also generates the TypeScript client)
npm run db:migrate
# Prisma will prompt for a migration name — enter something like "init"

# 4. Start the dev server
npm run dev
```

Your API is now running at `http://localhost:3000`.

---

## Daily Development

```bash
# Start dev server with hot reload
npm run dev

# Open Prisma Studio (visual DB browser in your browser)
npm run db:studio
```

---

## Database

```bash
# Apply schema changes to the DB (run this after editing prisma/schema.prisma)
npm run db:migrate

# Regenerate the TypeScript client without creating a migration
# (use this if you manually edited the DB or want to sync types)
npm run db:generate

# Open a visual table browser at http://localhost:5555
npm run db:studio

# Reset DB (drops all data and re-runs all migrations from scratch)
npx prisma migrate reset
```

---

## Building & Running in Production

```bash
# Compile TypeScript → dist/
npm run build

# Run the compiled output
npm start
```

---

## Testing

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

---

## Useful One-Liners

```bash
# Check what migrations have been applied to your DB
npx prisma migrate status

# Format the Prisma schema file
npx prisma format

# Introspect an existing DB and generate schema from it (useful if DB was modified externally)
npx prisma db pull

# Push schema changes directly to DB without creating a migration file (dev only, no history)
npx prisma db push
```

---

## Environment Variables

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/budget_calculator` | Postgres connection string |
| `PORT` | `3000` | HTTP port the server listens on |
| `CURRENCY_API_URL` | `https://api.frankfurter.app` | Base URL for exchange rate API |
| `CURRENCY_REFRESH_CRON` | `0 6 * * *` | Cron schedule for rate refresh (daily at 6am) |
