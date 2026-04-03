import { z } from 'zod'

const CurrencyEnum = z.enum(['NIS', 'USD', 'EUR'])
const AssetTypeEnum = z.enum([
  'BANK_ACCOUNT',
  'TRADING_ACCOUNT',
  'EDUCATION_FUND',
  'INVESTMENT_GEMEL',
  'GEMEL',
  'PENSION_FUND',
  'KEREN_KASPIT',
])

export const CreateAssetSchema = z.object({
  name: z.string().min(1).max(200),
  type: AssetTypeEnum,
  currency: CurrencyEnum.default('NIS'),
})

export const UpdateAssetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  currency: CurrencyEnum.optional(),
})

export const RecordAssetValueSchema = z.object({
  snapshot_id: z.string().cuid(),
  value: z.number().positive(),
})

export type CreateAsset = z.infer<typeof CreateAssetSchema>
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>
export type RecordAssetValue = z.infer<typeof RecordAssetValueSchema>
