import { prisma } from '../../config/db'
import { toNis } from '../../config/currency'
import { calcMonthlyPayment, addMonths } from '../../utils/loanCalculator'
import { injectLoanPayments } from '../../utils/snapshotCarryover'
import { Currency, GoalStatus } from '@prisma/client'
import type { CreateGoal, UpdateGoal, CreateSection, UpdateSection, CreateLoan, UpdateLoan } from './schema'

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function createGoal(data: CreateGoal) {
  return prisma.goal.create({
    data: {
      name: data.name,
      description: data.description,
      total_cost: data.total_cost,
      currency: data.currency as Currency,
    },
    include: { sections: true, loan: true },
  })
}

export async function listGoals(status?: string) {
  return prisma.goal.findMany({
    where: status ? { status: status as GoalStatus } : undefined,
    orderBy: { created_at: 'desc' },
    include: { sections: { orderBy: { order: 'asc' } }, loan: true },
  })
}

export async function getGoal(id: string) {
  return prisma.goal.findUniqueOrThrow({
    where: { id },
    include: { sections: { orderBy: { order: 'asc' } }, loan: true },
  })
}

export async function updateGoal(id: string, data: UpdateGoal) {
  await prisma.goal.findUniqueOrThrow({ where: { id } })
  return prisma.goal.update({
    where: { id },
    data,
    include: { sections: { orderBy: { order: 'asc' } }, loan: true },
  })
}

export async function deleteGoal(id: string) {
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id } })
  if (goal.status === GoalStatus.ACTIVE) {
    throw Object.assign(new Error('Deactivate the goal before deleting it'), { code: 'GOAL_ACTIVE' })
  }
  await prisma.goal.delete({ where: { id } })
}

// ── Sections ──────────────────────────────────────────────────────────────────

export async function addSection(goalId: string, data: CreateSection) {
  await prisma.goal.findUniqueOrThrow({ where: { id: goalId } })
  return prisma.goalSection.create({
    data: {
      goal_id: goalId,
      name: data.name,
      description: data.description,
      cost: data.cost,
      currency: data.currency as Currency,
      order: data.order,
    },
  })
}

export async function updateSection(goalId: string, sectionId: string, data: UpdateSection) {
  await prisma.goalSection.findFirstOrThrow({ where: { id: sectionId, goal_id: goalId } })
  return prisma.goalSection.update({ where: { id: sectionId }, data })
}

export async function deleteSection(goalId: string, sectionId: string) {
  await prisma.goalSection.findFirstOrThrow({ where: { id: sectionId, goal_id: goalId } })
  await prisma.goalSection.delete({ where: { id: sectionId } })
}

// ── Loan ──────────────────────────────────────────────────────────────────────

export async function attachLoan(goalId: string, data: CreateLoan) {
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id: goalId }, include: { loan: true } })
  if (goal.loan) {
    throw Object.assign(new Error('Goal already has a loan. Update or delete it first.'), { code: 'LOAN_EXISTS' })
  }
  if (goal.status === GoalStatus.ACTIVE) {
    throw Object.assign(new Error('Cannot modify loan on an active goal'), { code: 'GOAL_ACTIVE' })
  }

  const monthly_payment = calcMonthlyPayment(
    data.total_amount,
    Number(data.annual_rate),
    data.spread_months,
  )

  return prisma.loan.create({
    data: {
      goal_id: goalId,
      total_amount: data.total_amount,
      currency: data.currency as Currency,
      spread_months: data.spread_months,
      annual_rate: data.annual_rate,
      monthly_payment,
    },
  })
}

export async function updateLoan(goalId: string, data: UpdateLoan) {
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id: goalId }, include: { loan: true } })
  if (!goal.loan) throw Object.assign(new Error('No loan attached to this goal'), { code: 'NO_LOAN' })
  if (goal.status === GoalStatus.ACTIVE) {
    throw Object.assign(new Error('Cannot modify loan on an active goal'), { code: 'GOAL_ACTIVE' })
  }

  const current = goal.loan
  const total_amount = data.total_amount ?? Number(current.total_amount)
  const annual_rate = data.annual_rate ?? Number(current.annual_rate)
  const spread_months = data.spread_months ?? current.spread_months
  const monthly_payment = calcMonthlyPayment(total_amount, annual_rate, spread_months)

  return prisma.loan.update({
    where: { id: current.id },
    data: { ...data, monthly_payment },
  })
}

export async function deleteLoan(goalId: string) {
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id: goalId }, include: { loan: true } })
  if (!goal.loan) throw Object.assign(new Error('No loan attached to this goal'), { code: 'NO_LOAN' })
  if (goal.status === GoalStatus.ACTIVE) {
    throw Object.assign(new Error('Cannot delete loan on an active goal'), { code: 'GOAL_ACTIVE' })
  }
  await prisma.loan.delete({ where: { id: goal.loan.id } })
}

// ── Activation ────────────────────────────────────────────────────────────────

export async function activateGoal(id: string) {
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id }, include: { loan: true } })

  if (goal.status === GoalStatus.ACTIVE) {
    throw Object.assign(new Error('Goal is already active'), { code: 'ALREADY_ACTIVE' })
  }
  if (goal.status === GoalStatus.COMPLETED) {
    throw Object.assign(new Error('Completed goals cannot be reactivated'), { code: 'COMPLETED' })
  }

  const now = new Date()
  // First payment starts next calendar month
  const rawNextMonth = now.getMonth() + 2 // getMonth() is 0-indexed; +1 = current, +1 = next
  const startYear = rawNextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear()
  const startMonth = rawNextMonth > 12 ? 1 : rawNextMonth

  // Collect newly created payment IDs during the transaction so the post-transaction
  // amount_nis correction is scoped only to this activation (safe for re-activation of PAUSED goals).
  const newPaymentIds: string[] = []

  await prisma.$transaction(async (tx) => {
    await tx.goal.update({
      where: { id },
      data: { status: GoalStatus.ACTIVE, activated_at: new Date() },
    })

    if (!goal.loan) return

    await tx.loan.update({
      where: { id: goal.loan.id },
      data: { start_month: startMonth, start_year: startYear },
    })

    for (let i = 0; i < goal.loan.spread_months; i++) {
      const { year, month } = addMonths(startYear, startMonth, i)

      const loanPayment = await tx.loanPayment.create({
        data: {
          loan_id: goal.loan.id,
          year,
          month,
          payment_num: i + 1,
          amount: goal.loan.monthly_payment,
          // toNis is async/external — cannot run inside a Prisma transaction.
          // Placeholder is corrected immediately after the transaction via scoped updateMany.
          amount_nis: goal.loan.monthly_payment,
        },
      })

      newPaymentIds.push(loanPayment.id)

      // Inject into existing finalized snapshot for this month (if any)
      const snapshot = await tx.monthlySnapshot.findUnique({
        where: { year_month_is_draft: { year, month, is_draft: false } },
      })
      if (snapshot) {
        await tx.fixedExpense.create({
          data: {
            snapshot_id: snapshot.id,
            name: `Loan payment – ${i + 1}/${goal.loan.spread_months}`,
            amount: goal.loan.monthly_payment,
            currency: goal.loan.currency,
            amount_nis: goal.loan.monthly_payment, // corrected after transaction
            category: 'OTHER',
            is_loan_payment: true,
            loan_payment_id: loanPayment.id,
          },
        })
      }
    }
  })

  // Correct amount_nis — scoped to newly created payments only to avoid corrupting
  // prior-activation records if this goal was previously PAUSED and re-activated.
  if (goal.loan && newPaymentIds.length > 0) {
    const amount_nis = await toNis(Number(goal.loan.monthly_payment), goal.loan.currency as Currency)
    await prisma.loanPayment.updateMany({
      where: { id: { in: newPaymentIds } },
      data: { amount_nis },
    })
    await prisma.fixedExpense.updateMany({
      where: { loan_payment_id: { in: newPaymentIds } },
      data: { amount_nis },
    })
  }

  return getGoal(id)
}

export async function deactivateGoal(id: string) {
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id }, include: { loan: true } })

  if (goal.status !== GoalStatus.ACTIVE) {
    throw Object.assign(new Error('Goal is not active'), { code: 'NOT_ACTIVE' })
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-indexed

  await prisma.$transaction(async (tx) => {
    await tx.goal.update({ where: { id }, data: { status: GoalStatus.PAUSED } })

    if (!goal.loan) return

    // Find future unpaid loan payments (month after current)
    const futureLoanPayments = await tx.loanPayment.findMany({
      where: {
        loan_id: goal.loan.id,
        OR: [
          { year: { gt: currentYear } },
          { year: currentYear, month: { gt: currentMonth } },
        ],
      },
      select: { id: true },
    })

    if (futureLoanPayments.length === 0) return

    const paymentIds = futureLoanPayments.map((p) => p.id)

    // Delete linked FixedExpense rows first (FK constraint)
    await tx.fixedExpense.deleteMany({ where: { loan_payment_id: { in: paymentIds } } })
    await tx.loanPayment.deleteMany({ where: { id: { in: paymentIds } } })
  })

  return getGoal(id)
}
