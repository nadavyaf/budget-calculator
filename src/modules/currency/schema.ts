import { z } from 'zod'

const CurrencyEnum = z.enum(['NIS', 'USD', 'EUR'])

export const ConvertSchema = z.object({
  amount: z.coerce.number().positive(),
  from: CurrencyEnum,
  to: CurrencyEnum.default('NIS'),
})

export type Convert = z.infer<typeof ConvertSchema>
