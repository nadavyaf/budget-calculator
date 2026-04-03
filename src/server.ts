import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { snapshotRoutes } from './modules/snapshots/router'
import { incomeRoutes } from './modules/income/router'
import { expenseRoutes } from './modules/expenses/router'
import { assetRoutes } from './modules/assets/router'
import { goalRoutes } from './modules/goals/router'
import { currencyRoutes } from './modules/currency/router'
import { env } from './config/env'

// Map app error codes to HTTP status codes
const APP_ERROR_STATUS: Record<string, number> = {
  DUPLICATE: 409,
  NOT_DRAFT: 400,
  LOAN_PAYMENT: 400,
  LOAN_EXISTS: 409,
  NO_LOAN: 404,
  GOAL_ACTIVE: 409,
  ALREADY_ACTIVE: 409,
  NOT_ACTIVE: 400,
  COMPLETED: 400,
  UNSUPPORTED: 400,
  SNAPSHOT_FINALIZED: 409,
}

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  })

  await app.register(cors, { origin: true })
  await app.register(helmet)

  // ── Global error handler ────────────────────────────────────────────────────
  app.setErrorHandler((error, req, reply) => {
    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      })
    }

    // App-level errors with a .code property — explicitly exclude Prisma errors,
    // which also carry a .code field (e.g. "P2025"), to prevent misrouting.
    const appCode = (error as { code?: string }).code
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) &&
      appCode &&
      APP_ERROR_STATUS[appCode]
    ) {
      return reply.code(APP_ERROR_STATUS[appCode]).send({ error: (error as Error).message, code: appCode })
    }

    // Prisma: record not found
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return reply.code(404).send({ error: 'Resource not found' })
    }

    // Prisma: unique constraint violation (e.g. race condition fallback)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return reply.code(409).send({ error: 'Resource already exists' })
    }

    // Default: let Fastify handle it (logs + 500)
    reply.send(error)
  })

  // ── Health check ────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // ── Routes ──────────────────────────────────────────────────────────────────
  await app.register(snapshotRoutes, { prefix: '/snapshots' })
  // Income and expenses are nested under /snapshots/:id — register with parent prefix
  await app.register(incomeRoutes, { prefix: '/snapshots/:id/income' })
  await app.register(expenseRoutes, { prefix: '/snapshots/:id' })
  await app.register(assetRoutes, { prefix: '/assets' })
  await app.register(goalRoutes, { prefix: '/goals' })
  await app.register(currencyRoutes, { prefix: '/currency' })

  return app
}
