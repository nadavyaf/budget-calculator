import cron from 'node-cron'
import { refreshExchangeRates } from '../config/currency'
import { env } from '../config/env'

export function startCurrencySync(): cron.ScheduledTask {
  const task = cron.schedule(env.CURRENCY_REFRESH_CRON, async () => {
    console.info('[currency-sync] Refreshing exchange rates...')
    try {
      await refreshExchangeRates()
      console.info('[currency-sync] Exchange rates updated.')
    } catch (err) {
      // refreshExchangeRates already logs — swallow here so the cron stays alive
      console.error('[currency-sync] Refresh failed, will retry on next tick.', err)
    }
  })

  console.info(`[currency-sync] Scheduled with cron: "${env.CURRENCY_REFRESH_CRON}"`)
  return task
}
