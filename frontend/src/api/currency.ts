import { api } from './client'

export interface Rate {
  id: string
  from: string
  to: string
  rate: number
  fetched_at: string
}

export const currencyApi = {
  rates:   () => api.get<Rate[]>('/currency/rates'),
  refresh: () => api.post<void>('/currency/rates/refresh', {}),
  convert: (amount: number, from: string, to: string) =>
    api.get<{ amount: number; from: string; to: string; result: number; rate: number }>(
      `/currency/convert?amount=${amount}&from=${from}&to=${to}`,
    ),
}
