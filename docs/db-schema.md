# Database Schema

All tables are managed by Prisma. The schema lives in `prisma/schema.prisma`.

## Overview

```
MonthlySnapshot ──< IncomeSource
                ──< FixedExpense ──> LoanPayment ──> Loan ──> Goal ──< GoalSection
                ──< OneTimeExpense
                ──< AssetSnapshot ──> Asset
                ──< LoanPayment

ExchangeRate   (standalone, updated daily)
```

---

## Tables

### `monthly_snapshots`
The central hub for a single calendar month. Everything else hangs off this.

| Column | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| year | Int | e.g. 2025 |
| month | Int | 1–12 |
| is_draft | Boolean | `true` = simulation, `false` = real data |
| finalized_at | DateTime? | Set when draft is promoted to real |
| created_at | DateTime | Auto-set |

**Constraint:** one real snapshot + one draft per (year, month) pair.

---

### `income_sources`
Each line of income in a given month (salary, rental income, freelance, etc.).

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| snapshot_id | String | FK → monthly_snapshots |
| name | String | e.g. "Salary", "Rent from apartment" |
| amount | Decimal | Amount in original currency |
| currency | Enum | NIS / USD / EUR |
| amount_nis | Decimal | Converted to NIS at time of entry |

---

### `fixed_expenses`
Recurring monthly expenses. Auto-copied into each new month from the previous month.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| snapshot_id | String | FK → monthly_snapshots |
| name | String | e.g. "Mortgage", "Netflix" |
| amount | Decimal | Original currency amount |
| currency | Enum | NIS / USD / EUR |
| amount_nis | Decimal | NIS-converted amount |
| category | Enum | HOUSING / TRANSPORT / FOOD / UTILITIES / SUBSCRIPTIONS / OTHER |
| source_expense_id | String? | Points to the expense this was copied from (carryover chain) |
| is_loan_payment | Boolean | `true` = auto-injected from an active goal's loan |
| loan_payment_id | String? | FK → loan_payments (only if is_loan_payment = true) |

**Note:** rows where `is_loan_payment = true` cannot be manually deleted — they're managed by goal activation/deactivation.

---

### `one_time_expenses`
Single-month expenses. Never carried over.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| snapshot_id | String | FK → monthly_snapshots |
| name | String | e.g. "Car repair", "Vacation flights" |
| amount | Decimal | Original currency amount |
| currency | Enum | NIS / USD / EUR |
| amount_nis | Decimal | NIS-converted amount |
| category | Enum | HOUSING / TRANSPORT / FOOD / UTILITIES / SUBSCRIPTIONS / OTHER |

---

### `assets`
Master record for a financial asset. Persists across months.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| name | String | User-given name, e.g. "IBI Trading Account" |
| type | Enum | See asset types below |
| currency | Enum | Native currency of the asset |
| show_pct_change | Boolean | Whether to show % gain/loss (false for bank accounts) |
| is_active | Boolean | Soft delete flag |

**Asset types:**
- `BANK_ACCOUNT` — checking/savings account balance
- `TRADING_ACCOUNT` — personal brokerage / trading account
- `EDUCATION_FUND` — קרן השתלמות לימודים
- `INVESTMENT_GEMEL` — גמל להשקעה
- `GEMEL` — קופת גמל
- `PENSION_FUND` — פנסיה
- `KEREN_KASPIT` — קרן כספית

---

### `asset_snapshots`
The value of a specific asset in a specific month.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| asset_id | String | FK → assets |
| snapshot_id | String | FK → monthly_snapshots |
| value | Decimal | Value in asset's native currency |
| value_nis | Decimal | NIS-converted value at time of entry |

**Constraint:** one value per (asset, snapshot) pair.

% gain/loss is computed at read time: `(this_value_nis - prev_value_nis) / prev_value_nis × 100`

---

### `goals`
A financial goal/plan (e.g. "Buy apartment", "Thailand vacation").

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| name | String | Goal name |
| description | String? | Optional details |
| total_cost | Decimal | Total target amount |
| currency | Enum | NIS / USD / EUR |
| status | Enum | DRAFT / ACTIVE / COMPLETED / PAUSED |
| activated_at | DateTime? | Set when goal is activated |

---

### `goal_sections`
Sub-items of a goal (e.g. for "Thailand vacation": "Flights", "Hotel", "Spending money").

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| goal_id | String | FK → goals |
| name | String | Section name |
| description | String? | Optional details |
| cost | Decimal | Cost of this section |
| order | Int | Display order |
| is_complete | Boolean | Manually toggled by user |

---

### `loans`
A loan attached to a goal. One goal can have at most one loan.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| goal_id | String (unique) | FK → goals (one-to-one) |
| total_amount | Decimal | Total loan principal |
| currency | Enum | NIS / USD / EUR |
| spread_months | Int | Number of monthly payments |
| annual_rate | Decimal | Annual interest rate, e.g. 0.045 = 4.5% |
| monthly_payment | Decimal | Pre-computed: `P × r / (1 − (1+r)^−n)` |
| start_month | Int? | Set on activation — first payment month |
| start_year | Int? | Set on activation — first payment year |

---

### `loan_payments`
One record per monthly installment of a loan. Generated in bulk when a goal is activated.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| loan_id | String | FK → loans |
| snapshot_id | String | FK → the monthly_snapshot this payment falls in |
| payment_num | Int | Installment number (1 to spread_months) |
| amount | Decimal | Payment amount in loan's currency |
| amount_nis | Decimal | NIS-converted amount |

**Constraint:** one payment per (loan, payment_num) pair.

When a goal is deactivated, future loan_payments (and their linked fixed_expenses) are deleted. Past payments in finalized snapshots are untouched.

---

### `exchange_rates`
Live currency conversion rates, refreshed daily.

| Column | Type | Description |
|---|---|---|
| id | String | Primary key |
| from | Enum | USD or EUR |
| to | Enum | Always NIS (ILS) |
| rate | Decimal | e.g. 3.72 (1 USD = 3.72 NIS) |
| fetched_at | DateTime | When this rate was fetched |

The latest record per `(from, to)` pair is the active rate. History is kept for reference.

---

## Enums

```
Currency:        NIS | USD | EUR
ExpenseCategory: HOUSING | TRANSPORT | FOOD | UTILITIES | SUBSCRIPTIONS | OTHER
AssetType:       BANK_ACCOUNT | TRADING_ACCOUNT | EDUCATION_FUND | INVESTMENT_GEMEL | GEMEL | PENSION_FUND | KEREN_KASPIT
GoalStatus:      DRAFT | ACTIVE | COMPLETED | PAUSED
```
