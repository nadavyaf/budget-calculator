/**
 * Computes the fixed monthly payment for an amortizing loan.
 *
 * @param principal  - Total loan amount (in any currency)
 * @param annualRate - Annual interest rate as a decimal fraction (e.g. 0.045 for 4.5%)
 * @param months     - Number of monthly payments
 * @returns Monthly payment amount, rounded to 2 decimal places
 */
export function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number,
): number {
  if (months <= 0) throw new Error('months must be > 0')
  if (principal < 0) throw new Error('principal must be >= 0')
  // Callers must pass Number(loan.annual_rate) — Prisma returns Decimal objects,
  // not JS numbers, and the arithmetic below will silently produce NaN otherwise.
  if (annualRate === 0) {
    return Math.round((principal / months) * 100) / 100
  }
  const r = annualRate / 12
  const payment = (principal * r) / (1 - Math.pow(1 + r, -months))
  return Math.round(payment * 100) / 100
}

/**
 * Returns the { year, month } for a payment N months after a start date.
 * Handles year rollover automatically.
 *
 * @param startYear  - The year of the first payment
 * @param startMonth - The month of the first payment (1–12)
 * @param offset     - Number of months to add (0 = same month as start)
 */
export function addMonths(
  startYear: number,
  startMonth: number,
  offset: number,
): { year: number; month: number } {
  const totalMonths = (startYear * 12 + (startMonth - 1)) + offset
  return {
    year: Math.floor(totalMonths / 12),
    month: (totalMonths % 12) + 1,
  }
}
