import { api } from './client'

export interface Asset {
  id: string
  name: string
  type: string
  currency: string
  is_active: boolean
  show_pct_change: boolean
  latest_value_nis: number | null
  change_pct: number | null
  change_abs: number | null
  created_at: string
}

export interface AssetHistoryPoint {
  snapshot_id: string
  year: number
  month: number
  value: number
  value_nis: number
  prev_value_nis: number | null
  change_pct: number | null
  change_abs: number | null
}

export interface AssetTotals {
  snapshot: { id: string; year: number; month: number } | null
  total_nis: number
  prev_total_nis: number | null
  change_pct: number | null
  change_abs: number | null
}

export const assetsApi = {
  list:        ()                      => api.get<Asset[]>('/assets'),
  create:      (body: object)          => api.post<Asset>('/assets', body),
  update:      (id: string, b: object) => api.patch<Asset>(`/assets/${id}`, b),
  delete:      (id: string)            => api.delete<void>(`/assets/${id}`),
  recordValue: (id: string, b: object) => api.post<unknown>(`/assets/${id}/values`, b),
  history:     (id: string)            => api.get<AssetHistoryPoint[]>(`/assets/${id}/values`),
  totals:      (snapshotId?: string)   => {
    const q = snapshotId ? `?snapshotId=${snapshotId}` : ''
    return api.get<AssetTotals>(`/assets/totals${q}`)
  },
}
