import { FastifyInstance } from 'fastify'
import * as service from './service'
import { CreateSnapshotSchema, ListSnapshotsSchema } from './schema'

export async function snapshotRoutes(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    const body = CreateSnapshotSchema.parse(req.body)
    const result = await service.createSnapshot(body)
    return reply.code(201).send(result)
  })

  app.get('/', async (req, reply) => {
    const query = ListSnapshotsSchema.parse(req.query)
    return service.listSnapshots(query)
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    return service.getSnapshot(id)
  })

  app.get('/:id/summary', async (req, reply) => {
    const { id } = req.params as { id: string }
    return service.getSnapshotSummary(id)
  })

  app.patch('/:id/finalize', async (req, reply) => {
    const { id } = req.params as { id: string }
    return service.finalizeSnapshot(id)
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await service.deleteSnapshot(id)
    return reply.code(204).send()
  })
}
