import { FastifyInstance } from 'fastify'
import * as service from './service'
import { CreateExpenseSchema, UpdateExpenseSchema, ListExpensesQuery } from './schema'
import { IdParam, IdEidParam } from '../../utils/paramSchemas'

export async function expenseRoutes(app: FastifyInstance) {
  // ── Fixed Expenses ──────────────────────────────────────────────────────────
  app.post('/fixed-expenses', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const body = CreateExpenseSchema.parse(req.body)
    return reply.code(201).send(await service.addFixedExpense(id, body))
  })

  app.get('/fixed-expenses', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const { category } = ListExpensesQuery.parse(req.query)
    return service.listFixedExpenses(id, category)
  })

  app.patch('/fixed-expenses/:eid', async (req, reply) => {
    const { id, eid } = IdEidParam.parse(req.params)
    const body = UpdateExpenseSchema.parse(req.body)
    return service.updateFixedExpense(id, eid, body)
  })

  app.delete('/fixed-expenses/:eid', async (req, reply) => {
    const { id, eid } = IdEidParam.parse(req.params)
    await service.deleteFixedExpense(id, eid)
    return reply.code(204).send()
  })

  // ── One-time Expenses ───────────────────────────────────────────────────────
  app.post('/one-time-expenses', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const body = CreateExpenseSchema.parse(req.body)
    return reply.code(201).send(await service.addOneTimeExpense(id, body))
  })

  app.get('/one-time-expenses', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const { category } = ListExpensesQuery.parse(req.query)
    return service.listOneTimeExpenses(id, category)
  })

  app.patch('/one-time-expenses/:eid', async (req, reply) => {
    const { id, eid } = IdEidParam.parse(req.params)
    const body = UpdateExpenseSchema.parse(req.body)
    return service.updateOneTimeExpense(id, eid, body)
  })

  app.delete('/one-time-expenses/:eid', async (req, reply) => {
    const { id, eid } = IdEidParam.parse(req.params)
    await service.deleteOneTimeExpense(id, eid)
    return reply.code(204).send()
  })
}
