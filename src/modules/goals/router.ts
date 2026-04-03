import { FastifyInstance } from 'fastify'
import * as service from './service'
import {
  CreateGoalSchema,
  UpdateGoalSchema,
  CreateSectionSchema,
  UpdateSectionSchema,
  CreateLoanSchema,
  UpdateLoanSchema,
  ListGoalsQuery,
} from './schema'
import { IdParam, IdSidParam } from '../../utils/paramSchemas'

export async function goalRoutes(app: FastifyInstance) {
  // ── Goals ──────────────────────────────────────────────────────────────────
  app.post('/', async (req, reply) => {
    const body = CreateGoalSchema.parse(req.body)
    return reply.code(201).send(await service.createGoal(body))
  })

  app.get('/', async (req, reply) => {
    const { status } = ListGoalsQuery.parse(req.query)
    return service.listGoals(status)
  })

  app.get('/:id', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    return service.getGoal(id)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const body = UpdateGoalSchema.parse(req.body)
    return service.updateGoal(id, body)
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    await service.deleteGoal(id)
    return reply.code(204).send()
  })

  // ── Sections ───────────────────────────────────────────────────────────────
  app.post('/:id/sections', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const body = CreateSectionSchema.parse(req.body)
    return reply.code(201).send(await service.addSection(id, body))
  })

  app.patch('/:id/sections/:sid', async (req, reply) => {
    const { id, sid } = IdSidParam.parse(req.params)
    const body = UpdateSectionSchema.parse(req.body)
    return service.updateSection(id, sid, body)
  })

  app.delete('/:id/sections/:sid', async (req, reply) => {
    const { id, sid } = IdSidParam.parse(req.params)
    await service.deleteSection(id, sid)
    return reply.code(204).send()
  })

  // ── Loan ───────────────────────────────────────────────────────────────────
  app.post('/:id/loan', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const body = CreateLoanSchema.parse(req.body)
    return reply.code(201).send(await service.attachLoan(id, body))
  })

  app.patch('/:id/loan', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const body = UpdateLoanSchema.parse(req.body)
    return service.updateLoan(id, body)
  })

  app.delete('/:id/loan', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    await service.deleteLoan(id)
    return reply.code(204).send()
  })

  // ── Activation ─────────────────────────────────────────────────────────────
  app.post('/:id/activate', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    return service.activateGoal(id)
  })

  app.post('/:id/deactivate', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    return service.deactivateGoal(id)
  })
}
