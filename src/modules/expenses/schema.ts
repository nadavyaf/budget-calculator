import { z } from 'zod'

const CurrencyEnum = z.enum(['NIS', 'USD', 'EUR'])
const CategoryEnum = z.enum(['HOUSING', 'TRANSPORT', 'FOOD', 'UTILITIES', 'SUBSCRIPTIONS', 'OTHER'])

export const CreateExpenseSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: CurrencyEnum.default('NIS'),
  category: CategoryEnum.default('OTHER'),
})

export const UpdateExpenseSchema = CreateExpenseSchema.partial()

export type CreateExpense = z.infer<typeof CreateExpenseSchema>
export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>
