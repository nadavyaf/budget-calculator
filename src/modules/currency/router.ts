import { FastifyInstance } from 'fastify'
import * as service from './service'
import { ConvertSchema } from './schema'

export async function currencyRoutes(app: FastifyInstance) {
  app.get('/rates', async (req, reply) => {
    return service.getRates()
  })

  app.post('/rates/refresh', async (req, reply) => {
    return service.triggerRefresh()
  })

  app.get('/convert', async (req, reply) => {
    const query = ConvertSchema.parse(req.query)
    return service.convert(query)
  })
}
