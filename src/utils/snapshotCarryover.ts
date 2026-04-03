import { prisma } from '../config/db'

/**
 * Copies all fixed expenses from the most recent finalized snapshot (before the given
 * year/month) into the target snapshot. Sets source_expense_id to maintain the chain.
 */
export async function carryOverFixedExpenses(
  targetSnapshotId: string,
  targetYear: number,
  targetMonth: number,
): Promise<void> {
  // Find the most recent finalized snapshot before this month
  const prior = await prisma.monthlySnapshot.findFirst({
    where: {
      is_draft: false,
      OR: [
        { year: { lt: targetYear } },
        { year: targetYear, month: { lt: targetMonth } },
      ],
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      // Exclude loan-payment rows — those are managed by injectLoanPayments, not carryover.
      // Carrying them over would cause double-injection and stale amount_nis values.
      fixed_expenses: { where: { is_loan_payment: false } },
    },
  })

  if (!prior || prior.fixed_expenses.length === 0) return

  await prisma.fixedExpense.createMany({
    data: prior.fixed_expenses.map((e) => ({
      snapshot_id: targetSnapshotId,
      name: e.name,
      amount: e.amount,
      currency: e.currency,
      amount_nis: e.amount_nis,
      category: e.category,
      source_expense_id: e.id,
      is_loan_payment: e.is_loan_payment,
      loan_payment_id: e.loan_payment_id,
    })),
  })
}

/**
 * For any LoanPayment records that fall in the given year/month and are not yet
 * linked to a FixedExpense, create the corresponding FixedExpense rows.
 * This covers two cases:
 *   1. A new snapshot is created — picks up all pre-generated loan payments for that month.
 *   2. A goal is activated after the snapshot already exists — the activation logic calls
 *      this directly after generating the LoanPayment records.
 */
export async function injectLoanPayments(
  targetSnapshotId: string,
  year: number,
  month: number,
): Promise<void> {
  const loanPayments = await prisma.loanPayment.findMany({
    where: {
      year,
      month,
      fixed_expenses: { none: {} }, // not yet injected into this snapshot
    },
    include: { loan: true },
  })

  if (loanPayments.length === 0) return

  await prisma.fixedExpense.createMany({
    data: loanPayments.map((lp) => ({
      snapshot_id: targetSnapshotId,
      name: `Loan payment – ${lp.payment_num}/${lp.loan.spread_months}`,
      amount: lp.amount,
      currency: lp.loan.currency,
      amount_nis: lp.amount_nis,
      category: 'OTHER' as const,
      is_loan_payment: true,
      loan_payment_id: lp.id,
    })),
  })
}
