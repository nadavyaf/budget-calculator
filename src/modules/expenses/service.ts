import { prisma } from '../../config/db'
import { toNis } from '../../config/currency'
import { Currency, ExpenseCategory } from '@prisma/client'
import type { CreateExpense, UpdateExpense } from './schema'

// ── Fixed Expenses ────────────────────────────────────────────────────────────

export async function addFixedExpense(snapshotId: string, data: CreateExpense) {
  await prisma.monthlySnapshot.findUniqueOrThrow({ where: { id: snapshotId } })
  const amount_nis = await toNis(data.amount, data.currency as Currency)
  return prisma.fixedExpense.create({
    data: {
      snapshot_id: snapshotId,
      name: data.name,
      amount: data.amount,
      currency: data.currency as Currency,
      amount_nis,
      category: data.category as ExpenseCategory,
    },
  })
}

export async function listFixedExpenses(snapshotId: string, category?: string) {
  return prisma.fixedExpense.findMany({
    where: {
      snapshot_id: snapshotId,
      ...(category ? { category: category as ExpenseCategory } : {}),
    },
    orderBy: [{ category: 'asc' }, { created_at: 'asc' }],
  })
}

export async function updateFixedExpense(snapshotId: string, expenseId: string, data: UpdateExpense) {
  const existing = await prisma.fixedExpense.findFirstOrThrow({
    where: { id: expenseId, snapshot_id: snapshotId },
  })

  const amount_nis =
    data.amount !== undefined || data.currency !== undefined
      ? await toNis(data.amount ?? Number(existing.amount), (data.currency ?? existing.currency) as Currency)
      : undefined

  return prisma.fixedExpense.update({
    where: { id: expenseId },
    data: { ...data, ...(amount_nis !== undefined ? { amount_nis } : {}) },
  })
}

export async function deleteFixedExpense(snapshotId: string, expenseId: string) {
  const expense = await prisma.fixedExpense.findFirstOrThrow({
    where: { id: expenseId, snapshot_id: snapshotId },
  })
  if (expense.is_loan_payment) {
    throw Object.assign(
      new Error('Loan payment expenses are managed automatically and cannot be deleted manually'),
      { code: 'LOAN_PAYMENT' },
    )
  }
  await prisma.fixedExpense.delete({ where: { id: expenseId } })
}

// ── One-time Expenses ─────────────────────────────────────────────────────────

export async function addOneTimeExpense(snapshotId: string, data: CreateExpense) {
  await prisma.monthlySnapshot.findUniqueOrThrow({ where: { id: snapshotId } })
  const amount_nis = await toNis(data.amount, data.currency as Currency)
  return prisma.oneTimeExpense.create({
    data: {
      snapshot_id: snapshotId,
      name: data.name,
      amount: data.amount,
      currency: data.currency as Currency,
      amount_nis,
      category: data.category as ExpenseCategory,
    },
  })
}

export async function listOneTimeExpenses(snapshotId: string, category?: string) {
  return prisma.oneTimeExpense.findMany({
    where: {
      snapshot_id: snapshotId,
      ...(category ? { category: category as ExpenseCategory } : {}),
    },
    orderBy: [{ category: 'asc' }, { created_at: 'asc' }],
  })
}

export async function updateOneTimeExpense(snapshotId: string, expenseId: string, data: UpdateExpense) {
  const existing = await prisma.oneTimeExpense.findFirstOrThrow({
    where: { id: expenseId, snapshot_id: snapshotId },
  })

  const amount_nis =
    data.amount !== undefined || data.currency !== undefined
      ? await toNis(data.amount ?? Number(existing.amount), (data.currency ?? existing.currency) as Currency)
      : undefined

  return prisma.oneTimeExpense.update({
    where: { id: expenseId },
    data: { ...data, ...(amount_nis !== undefined ? { amount_nis } : {}) },
  })
}

export async function deleteOneTimeExpense(snapshotId: string, expenseId: string) {
  await prisma.oneTimeExpense.findFirstOrThrow({ where: { id: expenseId, snapshot_id: snapshotId } })
  await prisma.oneTimeExpense.delete({ where: { id: expenseId } })
}
