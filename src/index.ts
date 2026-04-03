import { buildServer } from './server'
import { refreshExchangeRates } from './config/currency'
import { prisma } from './config/db'
import { startCurrencySync } from './jobs/currencySync'
import { env } from './config/env'

async function main() {
  const app = await buildServer()
  const cronTask = startCurrencySync()

  // Fetch rates on startup so the app is immediately usable even before the first cron tick
  try {
    await refreshExchangeRates()
    app.log.info('Initial exchange rates loaded.')
  } catch (err) {
    app.log.warn('Could not fetch exchange rates on startup — will retry on next cron tick.')
  }

  // Graceful shutdown — guard against double-execution if both SIGINT and SIGTERM arrive
  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    app.log.info(`Received ${signal}, shutting down...`)
    cronTask.stop()
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('unhandledRejection', (err) => {
    app.log.error(err, 'unhandledRejection — shutting down')
    shutdown('unhandledRejection')
  })

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
}

main().catch((err) => {
  console.error('Fatal error during startup:', err)
  process.exit(1)
})
