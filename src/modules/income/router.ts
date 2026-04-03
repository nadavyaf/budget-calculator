import { FastifyInstance } from 'fastify'
import * as service from './service'
import { CreateIncomeSchema, UpdateIncomeSchema } from './schema'
import { IdParam, IdIidParam } from '../../utils/paramSchemas'

export async function incomeRoutes(app: FastifyInstance) {
  // :id comes from the parent snapshot route prefix (/snapshots/:id/income) via Fastify's merged params
  app.post('/', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const body = CreateIncomeSchema.parse(req.body)
    const result = await service.addIncome(id, body)
    return reply.code(201).send(result)
  })

  // :id comes from the parent snapshot route prefix (/snapshots/:id/income) via Fastify's merged params
  app.get('/', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    return service.listIncome(id)
  })

  app.patch('/:iid', async (req, reply) => {
    const { id, iid } = IdIidParam.parse(req.params)
    const body = UpdateIncomeSchema.parse(req.body)
    return service.updateIncome(id, iid, body)
  })

  app.delete('/:iid', async (req, reply) => {
    const { id, iid } = IdIidParam.parse(req.params)
    await service.deleteIncome(id, iid)
    return reply.code(204).send()
  })
}
