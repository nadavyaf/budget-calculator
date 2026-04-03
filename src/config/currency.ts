import axios from 'axios'
import { prisma } from './db'
import { env } from './env'
import { Currency } from '@prisma/client'

interface FrankfurterResponse {
  rates: Record<string, number>
}

/**
 * Fetches latest USD→ILS and EUR→ILS rates from frankfurter.app
 * and upserts them into exchange_rates.
 * Called on startup and by the daily cron job.
 */
export async function refreshExchangeRates(): Promise<void> {
  const pairs: Array<{ from: Currency; apiFrom: string }> = [
    { from: Currency.USD, apiFrom: 'USD' },
    { from: Currency.EUR, apiFrom: 'EUR' },
  ]

  try {
    for (const { from, apiFrom } of pairs) {
      const response = await axios.get<FrankfurterResponse>(
        `${env.CURRENCY_API_URL}/latest?from=${apiFrom}&to=ILS`,
        { timeout: 10_000 },
      )
      const rate = response.data.rates['ILS']
      if (!rate) throw new Error(`No ILS rate returned for ${apiFrom}`)

      await prisma.exchangeRate.create({
        data: {
          from,
          to: Currency.NIS,
          rate,
          fetched_at: new Date(),
        },
      })
    }

    // Keep only the last 90 days of rates to prevent unbounded table growth
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    await prisma.exchangeRate.deleteMany({ where: { fetched_at: { lt: cutoff } } })
  } catch (err) {
    // Log but do not crash the process — stale rates are better than no rates
    console.error('[currency] Failed to refresh exchange rates:', err)
    throw err
  }
}

/**
 * Returns the most recent stored rate for the given currency pair.
 * Falls back to 1.0 for NIS→NIS (no conversion needed).
 */
export async function getCurrentRate(from: Currency): Promise<number> {
  if (from === Currency.NIS) return 1

  const latest = await prisma.exchangeRate.findFirst({
    where: { from, to: Currency.NIS },
    orderBy: { fetched_at: 'desc' },
  })

  if (!latest) {
    throw new Error(`No exchange rate found for ${from}→NIS. Run POST /currency/rates/refresh.`)
  }

  return Number(latest.rate)
}

/**
 * Converts an amount in the given currency to NIS using the latest stored rate.
 */
export async function toNis(amount: number, currency: Currency): Promise<number> {
  const rate = await getCurrentRate(currency)
  return Math.round(amount * rate * 100) / 100
}
