import { prisma } from '../../config/db'
import { refreshExchangeRates, getCurrentRate } from '../../config/currency'
import { Currency } from '@prisma/client'
import type { Convert } from './schema'

export async function getRates() {
  const rates: Record<string, unknown>[] = []

  for (const from of [Currency.USD, Currency.EUR]) {
    const latest = await prisma.exchangeRate.findFirst({
      where: { from, to: Currency.NIS },
      orderBy: { fetched_at: 'desc' },
    })
    if (latest) {
      rates.push({
        from,
        to: Currency.NIS,
        rate: Number(latest.rate),
        fetched_at: latest.fetched_at,
      })
    }
  }

  return rates
}

export async function triggerRefresh() {
  await refreshExchangeRates()
  return getRates()
}

export async function convert(data: Convert) {
  if (data.from === data.to) return { amount: data.amount, from: data.from, to: data.to, result: data.amount, rate: 1 }

  // For now only support X → NIS conversion (to is always NIS)
  if (data.to !== 'NIS') {
    throw Object.assign(new Error('Only conversion to NIS is currently supported'), { code: 'UNSUPPORTED' })
  }

  const rate = await getCurrentRate(data.from as Currency)
  const result = Math.round(data.amount * rate * 100) / 100
  return { amount: data.amount, from: data.from, to: data.to, result, rate }
}
