import { api } from './client'

export interface GoalSection {
  id: string
  goal_id: string
  name: string
  description: string | null
  cost: number | null
  currency: string
  order: number
  is_complete: boolean
}

export interface Loan {
  id: string
  goal_id: string
  total_amount: number
  currency: string
  spread_months: number
  annual_rate: number
  monthly_payment: number
  start_month: number | null
  start_year: number | null
}

export interface Goal {
  id: string
  name: string
  description: string | null
  total_cost: number | null
  currency: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  activated_at: string | null
  created_at: string
  sections: GoalSection[]
  loan: Loan | null
}

export const goalsApi = {
  list:            (status?: string) => api.get<Goal[]>(`/goals${status ? `?status=${status}` : ''}`),
  get:             (id: string)              => api.get<Goal>(`/goals/${id}`),
  create:          (body: object)            => api.post<Goal>('/goals', body),
  update:          (id: string, b: object)   => api.patch<Goal>(`/goals/${id}`, b),
  delete:          (id: string)              => api.delete<void>(`/goals/${id}`),
  activate:        (id: string)              => api.post<Goal>(`/goals/${id}/activate`, {}),
  deactivate:      (id: string)              => api.post<Goal>(`/goals/${id}/deactivate`, {}),

  addSection:      (id: string, b: object)           => api.post<GoalSection>(`/goals/${id}/sections`, b),
  updateSection:   (id: string, sid: string, b: object) => api.patch<GoalSection>(`/goals/${id}/sections/${sid}`, b),
  deleteSection:   (id: string, sid: string)          => api.delete<void>(`/goals/${id}/sections/${sid}`),

  attachLoan:      (id: string, b: object)   => api.post<Loan>(`/goals/${id}/loan`, b),
  updateLoan:      (id: string, b: object)   => api.patch<Loan>(`/goals/${id}/loan`, b),
  deleteLoan:      (id: string)              => api.delete<void>(`/goals/${id}/loan`),
}
