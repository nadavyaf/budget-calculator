import { FastifyInstance } from 'fastify'
import * as service from './service'
import { CreateAssetSchema, UpdateAssetSchema, RecordAssetValueSchema, AssetTotalsQuery } from './schema'
import { IdParam } from '../../utils/paramSchemas'

export async function assetRoutes(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    const body = CreateAssetSchema.parse(req.body)
    return reply.code(201).send(await service.createAsset(body))
  })

  app.get('/', async (req, reply) => {
    return service.listAssets()
  })

  app.get('/totals', async (req, reply) => {
    const { snapshotId } = AssetTotalsQuery.parse(req.query)
    return service.getAssetTotals(snapshotId)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const body = UpdateAssetSchema.parse(req.body)
    return service.updateAsset(id, body)
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    await service.softDeleteAsset(id)
    return reply.code(204).send()
  })

  app.post('/:id/values', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    const body = RecordAssetValueSchema.parse(req.body)
    return reply.code(201).send(await service.recordAssetValue(id, body))
  })

  app.get('/:id/values', async (req, reply) => {
    const { id } = IdParam.parse(req.params)
    return service.getAssetHistory(id)
  })
}
