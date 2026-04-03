-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('NIS', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('HOUSING', 'TRANSPORT', 'FOOD', 'UTILITIES', 'SUBSCRIPTIONS', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('BANK_ACCOUNT', 'TRADING_ACCOUNT', 'EDUCATION_FUND', 'INVESTMENT_GEMEL', 'GEMEL', 'PENSION_FUND', 'KEREN_KASPIT');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED');

-- CreateTable
CREATE TABLE "monthly_snapshots" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_sources" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NIS',
    "amount_nis" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_expenses" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NIS',
    "amount_nis" DECIMAL(12,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "source_expense_id" TEXT,
    "is_loan_payment" BOOLEAN NOT NULL DEFAULT false,
    "loan_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_expenses" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NIS',
    "amount_nis" DECIMAL(12,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NIS',
    "show_pct_change" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_snapshots" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "value_nis" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NIS',
    "status" "GoalStatus" NOT NULL DEFAULT 'DRAFT',
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_sections" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cost" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NIS',
    "order" INTEGER NOT NULL,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "goal_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NIS',
    "spread_months" INTEGER NOT NULL,
    "annual_rate" DECIMAL(5,4) NOT NULL,
    "monthly_payment" DECIMAL(12,2) NOT NULL,
    "start_month" INTEGER,
    "start_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_payments" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "payment_num" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "amount_nis" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "from" "Currency" NOT NULL,
    "to" "Currency" NOT NULL DEFAULT 'NIS',
    "rate" DECIMAL(10,6) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_snapshots_year_month_idx" ON "monthly_snapshots"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_snapshots_year_month_is_draft_key" ON "monthly_snapshots"("year", "month", "is_draft");

-- CreateIndex
CREATE INDEX "income_sources_snapshot_id_idx" ON "income_sources"("snapshot_id");

-- CreateIndex
CREATE INDEX "fixed_expenses_snapshot_id_idx" ON "fixed_expenses"("snapshot_id");

-- CreateIndex
CREATE INDEX "fixed_expenses_source_expense_id_idx" ON "fixed_expenses"("source_expense_id");

-- CreateIndex
CREATE INDEX "fixed_expenses_loan_payment_id_idx" ON "fixed_expenses"("loan_payment_id");

-- CreateIndex
CREATE INDEX "one_time_expenses_snapshot_id_idx" ON "one_time_expenses"("snapshot_id");

-- CreateIndex
CREATE INDEX "asset_snapshots_asset_id_idx" ON "asset_snapshots"("asset_id");

-- CreateIndex
CREATE INDEX "asset_snapshots_snapshot_id_idx" ON "asset_snapshots"("snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_snapshots_asset_id_snapshot_id_key" ON "asset_snapshots"("asset_id", "snapshot_id");

-- CreateIndex
CREATE INDEX "goal_sections_goal_id_idx" ON "goal_sections"("goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "loans_goal_id_key" ON "loans"("goal_id");

-- CreateIndex
CREATE INDEX "loan_payments_loan_id_idx" ON "loan_payments"("loan_id");

-- CreateIndex
CREATE INDEX "loan_payments_year_month_idx" ON "loan_payments"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "loan_payments_loan_id_payment_num_key" ON "loan_payments"("loan_id", "payment_num");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_from_to_fetched_at_key" ON "exchange_rates"("from", "to", "fetched_at");

-- AddForeignKey
ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "monthly_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_source_expense_id_fkey" FOREIGN KEY ("source_expense_id") REFERENCES "fixed_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_loan_payment_id_fkey" FOREIGN KEY ("loan_payment_id") REFERENCES "loan_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "monthly_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_time_expenses" ADD CONSTRAINT "one_time_expenses_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "monthly_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_snapshots" ADD CONSTRAINT "asset_snapshots_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_snapshots" ADD CONSTRAINT "asset_snapshots_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "monthly_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_sections" ADD CONSTRAINT "goal_sections_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
