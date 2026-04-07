import type { FastifyPluginAsync } from 'fastify'

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => ({
    ok: true,
    service: fastify.config.APP_NAME,
    environment: fastify.config.NODE_ENV,
    timestamp: new Date().toISOString(),
  }))
}

export default healthRoutes

