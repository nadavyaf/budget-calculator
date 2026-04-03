import { FastifyInstance } from 'fastify'
import * as service from './service'
import {
  CreateGoalSchema,
  UpdateGoalSchema,
  CreateSectionSchema,
  UpdateSectionSchema,
  CreateLoanSchema,
  UpdateLoanSchema,
} from './schema'

export async function goalRoutes(app: FastifyInstance) {
  // ── Goals ──────────────────────────────────────────────────────────────────
  app.post('/', async (req, reply) => {
    const body = CreateGoalSchema.parse(req.body)
    return reply.code(201).send(await service.createGoal(body))
  })

  app.get('/', async (req, reply) => {
    const { status } = req.query as { status?: string }
    return service.listGoals(status)
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    return service.getGoal(id)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateGoalSchema.parse(req.body)
    return service.updateGoal(id, body)
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await service.deleteGoal(id)
    return reply.code(204).send()
  })

  // ── Sections ───────────────────────────────────────────────────────────────
  app.post('/:id/sections', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = CreateSectionSchema.parse(req.body)
    return reply.code(201).send(await service.addSection(id, body))
  })

  app.patch('/:id/sections/:sid', async (req, reply) => {
    const { id, sid } = req.params as { id: string; sid: string }
    const body = UpdateSectionSchema.parse(req.body)
    return service.updateSection(id, sid, body)
  })

  app.delete('/:id/sections/:sid', async (req, reply) => {
    const { id, sid } = req.params as { id: string; sid: string }
    await service.deleteSection(id, sid)
    return reply.code(204).send()
  })

  // ── Loan ───────────────────────────────────────────────────────────────────
  app.post('/:id/loan', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = CreateLoanSchema.parse(req.body)
    return reply.code(201).send(await service.attachLoan(id, body))
  })

  app.patch('/:id/loan', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = UpdateLoanSchema.parse(req.body)
    return service.updateLoan(id, body)
  })

  app.delete('/:id/loan', async (req, reply) => {
    const { id } = req.params as { id: string }
    await service.deleteLoan(id)
    return reply.code(204).send()
  })

  // ── Activation ─────────────────────────────────────────────────────────────
  app.post('/:id/activate', async (req, reply) => {
    const { id } = req.params as { id: string }
    return service.activateGoal(id)
  })

  app.post('/:id/deactivate', async (req, reply) => {
    const { id } = req.params as { id: string }
    return service.deactivateGoal(id)
  })
}
