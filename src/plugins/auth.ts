import fp from 'fastify-plugin'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { MicrosoftAuthService } from '../services/microsoft-auth.js'

export default fp(async function authPlugin(fastify) {
  await fastify.register(cookie, {
    secret: fastify.config.COOKIE_SECRET,
  })

  await fastify.register(jwt, {
    secret: fastify.config.JWT_SECRET,
    cookie: {
      cookieName: 'dhcloud_session',
      signed: false,
    },
  })

  fastify.decorate('microsoftAuth', new MicrosoftAuthService(fastify.config))

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
      request.sessionUser = {
        id: request.user.sub,
        email: request.user.email,
        name: request.user.name,
        userType: request.user.userType,
      }
    } catch {
      reply.unauthorized('DH Cloud session is missing or invalid.')
    }
  })
})

