import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import { loadConfig, type AppConfig } from './config/env.js'
import prismaPlugin from './plugins/prisma.js'
import authPlugin from './plugins/auth.js'
import rootRoutes from './routes/root.js'
import healthRoutes from './routes/health.js'
import authRoutes from './routes/auth.js'

export function buildApp(config: AppConfig = loadConfig()) {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test',
  })

  app.decorate('config', config)

  app.register(sensible)
  app.register(cors, {
    origin: [config.WEBSITE_URL, config.STAFF_PORTAL_URL, config.CLIENT_PORTAL_URL],
    credentials: true,
  })

  app.register(prismaPlugin)
  app.register(authPlugin)
  app.register(rootRoutes)
  app.register(healthRoutes)
  app.register(authRoutes)

  return app
}

