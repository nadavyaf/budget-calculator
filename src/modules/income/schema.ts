import { z } from 'zod'

export const CurrencyEnum = z.enum(['NIS', 'USD', 'EUR'])

export const CreateIncomeSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: CurrencyEnum.default('NIS'),
})

export const UpdateIncomeSchema = CreateIncomeSchema.partial()

export type CreateIncome = z.infer<typeof CreateIncomeSchema>
export type UpdateIncome = z.infer<typeof UpdateIncomeSchema>
