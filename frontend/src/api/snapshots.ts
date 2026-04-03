import { api } from './client'

export interface Snapshot {
  id: string
  year: number
  month: number
  is_draft: boolean
  finalized_at: string | null
  created_at: string
  leftover?: number
  total_income?: number
  total_expenses?: number
}

export interface SnapshotDetail extends Snapshot {
  income_sources: IncomeSource[]
  fixed_expenses: FixedExpense[]
  one_time_expenses: OneTimeExpense[]
  total_income: number
  total_fixed: number
  total_one_time: number
  leftover: number
}

export interface IncomeSource {
  id: string
  snapshot_id: string
  name: string
  amount: number
  currency: string
  amount_nis: number
  created_at: string
}

export interface FixedExpense {
  id: string
  snapshot_id: string
  name: string
  amount: number
  currency: string
  amount_nis: number
  category: string
  is_loan_payment: boolean
  created_at: string
}

export interface OneTimeExpense {
  id: string
  snapshot_id: string
  name: string
  amount: number
  currency: string
  amount_nis: number
  category: string
  created_at: string
}

export const snapshotsApi = {
  list: (params?: { year?: number; draft?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.year != null) qs.set('year', String(params.year))
    if (params?.draft != null) qs.set('draft', String(params.draft))
    const q = qs.toString()
    return api.get<Snapshot[]>(`/snapshots${q ? `?${q}` : ''}`)
  },
  get:      (id: string)             => api.get<SnapshotDetail>(`/snapshots/${id}`),
  create: () => {
    const now = new Date()
    return api.post<Snapshot>('/snapshots', { year: now.getFullYear(), month: now.getMonth() + 1, is_draft: true })
  },
  finalize: (id: string)             => api.patch<Snapshot>(`/snapshots/${id}/finalize`),
  delete:   (id: string)             => api.delete<void>(`/snapshots/${id}`),

  // Income
  listIncome:    (id: string)                     => api.get<IncomeSource[]>(`/snapshots/${id}/income`),
  addIncome:     (id: string, body: object)        => api.post<IncomeSource>(`/snapshots/${id}/income`, body),
  updateIncome:  (id: string, iid: string, b: object) => api.patch<IncomeSource>(`/snapshots/${id}/income/${iid}`, b),
  deleteIncome:  (id: string, iid: string)         => api.delete<void>(`/snapshots/${id}/income/${iid}`),

  // Fixed expenses
  listFixed:     (id: string)                     => api.get<FixedExpense[]>(`/snapshots/${id}/fixed-expenses`),
  addFixed:      (id: string, body: object)        => api.post<FixedExpense>(`/snapshots/${id}/fixed-expenses`, body),
  updateFixed:   (id: string, eid: string, b: object) => api.patch<FixedExpense>(`/snapshots/${id}/fixed-expenses/${eid}`, b),
  deleteFixed:   (id: string, eid: string)         => api.delete<void>(`/snapshots/${id}/fixed-expenses/${eid}`),

  // One-time expenses
  listOneTime:   (id: string)                     => api.get<OneTimeExpense[]>(`/snapshots/${id}/one-time-expenses`),
  addOneTime:    (id: string, body: object)        => api.post<OneTimeExpense>(`/snapshots/${id}/one-time-expenses`, body),
  updateOneTime: (id: string, eid: string, b: object) => api.patch<OneTimeExpense>(`/snapshots/${id}/one-time-expenses/${eid}`, b),
  deleteOneTime: (id: string, eid: string)         => api.delete<void>(`/snapshots/${id}/one-time-expenses/${eid}`),
}
