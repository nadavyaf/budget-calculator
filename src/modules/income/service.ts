import { prisma } from '../../config/db'
import { toNis } from '../../config/currency'
import { Currency } from '@prisma/client'
import type { CreateIncome, UpdateIncome } from './schema'

export async function addIncome(snapshotId: string, data: CreateIncome) {
  // Verify snapshot exists
  await prisma.monthlySnapshot.findUniqueOrThrow({ where: { id: snapshotId } })

  const amount_nis = await toNis(data.amount, data.currency as Currency)

  return prisma.incomeSource.create({
    data: {
      snapshot_id: snapshotId,
      name: data.name,
      amount: data.amount,
      currency: data.currency as Currency,
      amount_nis,
    },
  })
}

export async function listIncome(snapshotId: string) {
  await prisma.monthlySnapshot.findUniqueOrThrow({ where: { id: snapshotId } })
  return prisma.incomeSource.findMany({
    where: { snapshot_id: snapshotId },
    orderBy: { created_at: 'asc' },
  })
}

export async function updateIncome(snapshotId: string, incomeId: string, data: UpdateIncome) {
  // Single fetch verifies both ownership and gets existing values for NIS recalculation
  const existing = await prisma.incomeSource.findFirstOrThrow({
    where: { id: incomeId, snapshot_id: snapshotId },
  })

  const amount_nis =
    data.amount !== undefined || data.currency !== undefined
      ? await toNis(data.amount ?? Number(existing.amount), (data.currency ?? existing.currency) as Currency)
      : undefined

  return prisma.incomeSource.update({
    where: { id: incomeId },
    data: { ...data, ...(amount_nis !== undefined ? { amount_nis } : {}) },
  })
}

export async function deleteIncome(snapshotId: string, incomeId: string) {
  await prisma.incomeSource.findFirstOrThrow({ where: { id: incomeId, snapshot_id: snapshotId } })
  await prisma.incomeSource.delete({ where: { id: incomeId } })
}
