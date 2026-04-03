import { z } from 'zod'

const CurrencyEnum = z.enum(['NIS', 'USD', 'EUR'])

export const CreateGoalSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  total_cost: z.number().positive(),
  currency: CurrencyEnum.default('NIS'),
})

export const UpdateGoalSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  total_cost: z.number().positive().optional(),
  currency: CurrencyEnum.optional(),
  status: z.enum(['COMPLETED']).optional(), // only COMPLETED is user-settable; ACTIVE/PAUSED via activate/deactivate
})

export const CreateSectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  cost: z.number().nonnegative(),
  currency: CurrencyEnum.default('NIS'),
  order: z.number().int().nonnegative().default(0),
})

export const UpdateSectionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  cost: z.number().nonnegative().optional(),
  currency: CurrencyEnum.optional(),
  order: z.number().int().nonnegative().optional(),
  is_complete: z.boolean().optional(),
})

export const CreateLoanSchema = z.object({
  total_amount: z.number().positive(),
  currency: CurrencyEnum.default('NIS'),
  spread_months: z.number().int().min(1).max(360),
  annual_rate: z.number().min(0).max(9.9999), // stored as fraction: 0.045 = 4.5%
})

export const UpdateLoanSchema = CreateLoanSchema.partial()

export type CreateGoal = z.infer<typeof CreateGoalSchema>
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>
export type CreateSection = z.infer<typeof CreateSectionSchema>
export type UpdateSection = z.infer<typeof UpdateSectionSchema>
export type CreateLoan = z.infer<typeof CreateLoanSchema>
export type UpdateLoan = z.infer<typeof UpdateLoanSchema>
