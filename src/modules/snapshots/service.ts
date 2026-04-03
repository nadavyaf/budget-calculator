import { prisma } from '../../config/db'
import { Prisma } from '@prisma/client'
import { carryOverFixedExpenses, injectLoanPayments } from '../../utils/snapshotCarryover'
import type { CreateSnapshot } from './schema'

export async function createSnapshot(data: CreateSnapshot) {
  const { year, month, is_draft } = data

  // Check for duplicate
  const existing = await prisma.monthlySnapshot.findUnique({
    where: { year_month_is_draft: { year, month, is_draft } },
  })
  if (existing) {
    throw Object.assign(new Error('Snapshot already exists for this month'), { code: 'DUPLICATE' })
  }

  const snapshot = await prisma.monthlySnapshot.create({
    data: { year, month, is_draft },
  })

  // Carry over fixed expenses from prior finalized month (skip for drafts too — drafts start clean)
  if (!is_draft) {
    await carryOverFixedExpenses(snapshot.id, year, month)
    await injectLoanPayments(snapshot.id, year, month)
  }

  return getSnapshot(snapshot.id)
}

export async function listSnapshots(filters: { year?: number; draft?: string }) {
  const where: Prisma.MonthlySnapshotWhereInput = {}
  if (filters.year !== undefined) where.year = filters.year
  if (filters.draft !== undefined) where.is_draft = filters.draft === 'true'

  return prisma.monthlySnapshot.findMany({
    where,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    select: {
      id: true,
      year: true,
      month: true,
      is_draft: true,
      finalized_at: true,
      created_at: true,
    },
  })
}

export async function getSnapshot(id: string) {
  const snapshot = await prisma.monthlySnapshot.findUniqueOrThrow({
    where: { id },
    include: {
      income_sources: true,
      fixed_expenses: { orderBy: { category: 'asc' } },
      one_time_expenses: { orderBy: { category: 'asc' } },
    },
  })

  const totalIncome = snapshot.income_sources.reduce((s, r) => s + Number(r.amount_nis), 0)
  const totalFixed = snapshot.fixed_expenses.reduce((s, r) => s + Number(r.amount_nis), 0)
  const totalOneTime = snapshot.one_time_expenses.reduce((s, r) => s + Number(r.amount_nis), 0)
  const leftover = Math.round((totalIncome - totalFixed - totalOneTime) * 100) / 100

  return { ...snapshot, totals: { income: totalIncome, fixed: totalFixed, one_time: totalOneTime, leftover } }
}

export async function getSnapshotSummary(id: string) {
  const snapshot = await prisma.monthlySnapshot.findUniqueOrThrow({
    where: { id },
    include: {
      income_sources: true,
      fixed_expenses: true,
      one_time_expenses: true,
    },
  })

  const totalIncome = snapshot.income_sources.reduce((s, r) => s + Number(r.amount_nis), 0)

  // Group fixed expenses by category
  const fixedByCategory: Record<string, number> = {}
  for (const e of snapshot.fixed_expenses) {
    fixedByCategory[e.category] = (fixedByCategory[e.category] ?? 0) + Number(e.amount_nis)
  }

  const oneTimeByCategory: Record<string, number> = {}
  for (const e of snapshot.one_time_expenses) {
    oneTimeByCategory[e.category] = (oneTimeByCategory[e.category] ?? 0) + Number(e.amount_nis)
  }

  const totalFixed = Object.values(fixedByCategory).reduce((s, v) => s + v, 0)
  const totalOneTime = Object.values(oneTimeByCategory).reduce((s, v) => s + v, 0)

  return {
    id,
    year: snapshot.year,
    month: snapshot.month,
    is_draft: snapshot.is_draft,
    income: { total: totalIncome, sources: snapshot.income_sources.length },
    fixed_expenses: { total: totalFixed, by_category: fixedByCategory },
    one_time_expenses: { total: totalOneTime, by_category: oneTimeByCategory },
    leftover: Math.round((totalIncome - totalFixed - totalOneTime) * 100) / 100,
  }
}

export async function finalizeSnapshot(id: string) {
  // Use a transaction to prevent a race condition where two concurrent requests
  // both pass the "no finalized snapshot exists" check before either commits.
  return prisma.$transaction(async (tx) => {
    const snapshot = await tx.monthlySnapshot.findUniqueOrThrow({ where: { id } })

    if (!snapshot.is_draft) {
      throw Object.assign(new Error('Snapshot is already finalized'), { code: 'NOT_DRAFT' })
    }

    const existing = await tx.monthlySnapshot.findUnique({
      where: { year_month_is_draft: { year: snapshot.year, month: snapshot.month, is_draft: false } },
    })
    if (existing) {
      throw Object.assign(new Error('A finalized snapshot already exists for this month'), { code: 'DUPLICATE' })
    }

    return tx.monthlySnapshot.update({
      where: { id },
      data: { is_draft: false, finalized_at: new Date() },
    })
  })
}

export async function deleteSnapshot(id: string) {
  const snapshot = await prisma.monthlySnapshot.findUniqueOrThrow({ where: { id } })
  if (!snapshot.is_draft) {
    throw Object.assign(new Error('Only draft snapshots can be deleted'), { code: 'NOT_DRAFT' })
  }
  await prisma.monthlySnapshot.delete({ where: { id } })
}
