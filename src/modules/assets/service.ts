import { prisma } from '../../config/db'
import { toNis } from '../../config/currency'
import { Currency, AssetType } from '@prisma/client'
import type { CreateAsset, UpdateAsset, RecordAssetValue } from './schema'

export async function createAsset(data: CreateAsset) {
  return prisma.asset.create({
    data: {
      name: data.name,
      type: data.type as AssetType,
      currency: data.currency as Currency,
      // Bank accounts don't show % change — the number is just a balance
      show_pct_change: data.type !== 'BANK_ACCOUNT',
    },
  })
}

export async function listAssets() {
  const assets = await prisma.asset.findMany({
    where: { is_active: true },
    include: {
      snapshots: {
        orderBy: [{ snapshot: { year: 'desc' } }, { snapshot: { month: 'desc' } }],
        take: 2,
        include: { snapshot: { select: { year: true, month: true } } },
      },
    },
  })

  return assets.map((asset) => {
    const [latest, prev] = asset.snapshots
    const latestValue = latest ? Number(latest.value_nis) : null
    const prevValue = prev ? Number(prev.value_nis) : null
    const changePct =
      latestValue !== null && prevValue !== null && prevValue !== 0
        ? Math.round(((latestValue - prevValue) / prevValue) * 10000) / 100
        : null

    const { snapshots: _snapshots, ...assetFields } = asset
    return {
      ...assetFields,
      latest_value_nis: latestValue,
      change_pct: asset.show_pct_change ? changePct : null,
      change_abs: latestValue !== null && prevValue !== null ? Math.round((latestValue - prevValue) * 100) / 100 : null,
    }
  })
}

export async function updateAsset(assetId: string, data: UpdateAsset) {
  await prisma.asset.findUniqueOrThrow({ where: { id: assetId } })
  return prisma.asset.update({ where: { id: assetId }, data })
}

export async function softDeleteAsset(assetId: string) {
  await prisma.asset.findUniqueOrThrow({ where: { id: assetId } })
  await prisma.asset.update({ where: { id: assetId }, data: { is_active: false } })
}

export async function recordAssetValue(assetId: string, data: RecordAssetValue) {
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } })
  await prisma.monthlySnapshot.findUniqueOrThrow({ where: { id: data.snapshot_id } })

  const value_nis = await toNis(data.value, asset.currency as Currency)

  return prisma.assetSnapshot.upsert({
    where: { asset_id_snapshot_id: { asset_id: assetId, snapshot_id: data.snapshot_id } },
    create: { asset_id: assetId, snapshot_id: data.snapshot_id, value: data.value, value_nis },
    update: { value: data.value, value_nis },
  })
}

export async function getAssetHistory(assetId: string) {
  await prisma.asset.findUniqueOrThrow({ where: { id: assetId } })

  const snapshots = await prisma.assetSnapshot.findMany({
    where: { asset_id: assetId },
    orderBy: [{ snapshot: { year: 'asc' } }, { snapshot: { month: 'asc' } }],
    include: { snapshot: { select: { year: true, month: true } } },
  })

  return snapshots.map((s, i) => {
    const prev = snapshots[i - 1]
    const prevValue = prev ? Number(prev.value_nis) : null
    const currentValue = Number(s.value_nis)

    return {
      snapshot_id: s.snapshot_id,
      year: s.snapshot.year,
      month: s.snapshot.month,
      value: Number(s.value),
      value_nis: currentValue,
      prev_value_nis: prevValue,
      change_pct:
        prevValue !== null && prevValue !== 0
          ? Math.round(((currentValue - prevValue) / prevValue) * 10000) / 100
          : null,
      change_abs: prevValue !== null ? Math.round((currentValue - prevValue) * 100) / 100 : null,
    }
  })
}

export async function getAssetTotals(snapshotId?: string) {
  // If snapshotId provided, use that month; otherwise use the latest snapshot
  // (prefer finalized over draft for the same month via is_draft asc ordering)
  let targetSnapshotId = snapshotId
  if (!targetSnapshotId) {
    // Prefer finalized; fall back to draft if nothing finalized exists yet
    const latest =
      (await prisma.monthlySnapshot.findFirst({
        where: { is_draft: false },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      })) ??
      (await prisma.monthlySnapshot.findFirst({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }))
    if (!latest) return { total_nis: 0, prev_total_nis: null, change_pct: null, change_abs: null, snapshot: null }
    targetSnapshotId = latest.id
  }

  const snapshot = await prisma.monthlySnapshot.findUniqueOrThrow({ where: { id: targetSnapshotId } })

  const current = await prisma.assetSnapshot.findMany({ where: { snapshot_id: targetSnapshotId } })
  const totalNis = current.reduce((s, r) => s + Number(r.value_nis), 0)

  // Find prior snapshot (prefer finalized, fall back to draft)
  const prior =
    (await prisma.monthlySnapshot.findFirst({
      where: {
        is_draft: false,
        OR: [
          { year: { lt: snapshot.year } },
          { year: snapshot.year, month: { lt: snapshot.month } },
        ],
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })) ??
    (await prisma.monthlySnapshot.findFirst({
      where: {
        OR: [
          { year: { lt: snapshot.year } },
          { year: snapshot.year, month: { lt: snapshot.month } },
        ],
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }))

  let prevTotalNis: number | null = null
  if (prior) {
    const prevSnapshots = await prisma.assetSnapshot.findMany({ where: { snapshot_id: prior.id } })
    prevTotalNis = prevSnapshots.reduce((s, r) => s + Number(r.value_nis), 0)
  }

  return {
    snapshot: { id: snapshot.id, year: snapshot.year, month: snapshot.month },
    total_nis: Math.round(totalNis * 100) / 100,
    prev_total_nis: prevTotalNis !== null ? Math.round(prevTotalNis * 100) / 100 : null,
    change_pct:
      prevTotalNis !== null && prevTotalNis !== 0
        ? Math.round(((totalNis - prevTotalNis) / prevTotalNis) * 10000) / 100
        : null,
    change_abs:
      prevTotalNis !== null ? Math.round((totalNis - prevTotalNis) * 100) / 100 : null,
  }
}
