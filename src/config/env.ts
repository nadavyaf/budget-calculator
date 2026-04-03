import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  CURRENCY_API_URL: z.string().url().default('https://api.frankfurter.app'),
  CURRENCY_REFRESH_CRON: z.string().default('0 6 * * *'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const env = envSchema.parse(process.env)
