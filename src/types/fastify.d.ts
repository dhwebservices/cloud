import type { FastifyReply, FastifyRequest } from 'fastify'
import type { JwtPayload } from '@fastify/jwt'
import type { AppConfig } from '../config/env.js'
import type { PrismaClient } from '@prisma/client'
import type { MicrosoftAuthService, SessionUser } from '../services/microsoft-auth.js'

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig
    prisma: PrismaClient
    microsoftAuth: MicrosoftAuthService
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    sessionUser?: SessionUser
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload & {
      sub: string
      email: string
      userType: string
      name: string
    }
    user: {
      sub: string
      email: string
      userType: string
      name: string
    }
  }
}
