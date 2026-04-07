import type { FastifyPluginAsync } from 'fastify'

const rootRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => ({
    name: fastify.config.APP_NAME,
    status: 'running',
    docs: {
      health: '/health',
      authSession: '/v1/auth/session',
      microsoftStart: '/v1/auth/microsoft/start',
    },
  }))
}

export default rootRoutes

