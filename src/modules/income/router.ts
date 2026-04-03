import { FastifyInstance } from 'fastify'
import * as service from './service'
import { CreateIncomeSchema, UpdateIncomeSchema } from './schema'

export async function incomeRoutes(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = CreateIncomeSchema.parse(req.body)
    const result = await service.addIncome(id, body)
    return reply.code(201).send(result)
  })

  app.get('/', async (req, reply) => {
    const { id } = req.params as { id: string }
    return service.listIncome(id)
  })

  app.patch('/:iid', async (req, reply) => {
    const { id, iid } = req.params as { id: string; iid: string }
    const body = UpdateIncomeSchema.parse(req.body)
    return service.updateIncome(id, iid, body)
  })

  app.delete('/:iid', async (req, reply) => {
    const { id, iid } = req.params as { id: string; iid: string }
    await service.deleteIncome(id, iid)
    return reply.code(204).send()
  })
}
