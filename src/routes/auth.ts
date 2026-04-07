import type { FastifyPluginAsync } from 'fastify'
import { Prisma, type Provider, type UserType } from '@prisma/client'

const MICROSOFT_PROVIDER: Provider = 'MICROSOFT'
const STAFF_USER_TYPE: UserType = 'STAFF'

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/auth/microsoft/start', async (request, reply) => {
    const url = await fastify.microsoftAuth.createAuthorizationUrl(request, reply)
    return reply.redirect(url)
  })

  fastify.get('/v1/auth/microsoft/callback', async (request, reply) => {
    const code = typeof request.query === 'object' && request.query && 'code' in request.query
      ? String(request.query.code || '')
      : ''

    fastify.microsoftAuth.assertCallbackState(request)

    if (!code) {
      return reply.badRequest('Microsoft sign-in callback did not include an authorization code.')
    }

    const nonce = fastify.microsoftAuth.getNonce(request)
    const profile = await fastify.microsoftAuth.exchangeCodeForProfile(code, nonce)

    const user = await fastify.prisma.user.upsert({
      where: { email: profile.email },
      create: {
        email: profile.email,
        displayName: profile.displayName,
        firstName: profile.givenName || null,
        lastName: profile.familyName || null,
        userType: STAFF_USER_TYPE,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
        identities: {
          create: {
            provider: MICROSOFT_PROVIDER,
            providerAccountId: profile.microsoftUserId,
            tenantId: profile.tenantId,
            email: profile.email,
            metadata: toInputJson(profile.raw),
          },
        },
        staffProfile: {
          create: {
            microsoftObjectId: profile.microsoftUserId,
            lastSeenAt: new Date(),
          },
        },
      },
      update: {
        displayName: profile.displayName,
        firstName: profile.givenName || null,
        lastName: profile.familyName || null,
        lastLoginAt: new Date(),
        identities: {
          upsert: {
            where: {
              provider_providerAccountId: {
                provider: MICROSOFT_PROVIDER,
                providerAccountId: profile.microsoftUserId,
              },
            },
            update: {
              tenantId: profile.tenantId,
              email: profile.email,
              metadata: toInputJson(profile.raw),
            },
            create: {
              provider: MICROSOFT_PROVIDER,
              providerAccountId: profile.microsoftUserId,
              tenantId: profile.tenantId,
              email: profile.email,
              metadata: toInputJson(profile.raw),
            },
          },
        },
        staffProfile: {
          upsert: {
            update: {
              microsoftObjectId: profile.microsoftUserId,
              lastSeenAt: new Date(),
            },
            create: {
              microsoftObjectId: profile.microsoftUserId,
              lastSeenAt: new Date(),
            },
          },
        },
      },
    })

    await fastify.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth.microsoft.login',
        entityType: 'user',
        entityId: user.id,
        metadata: {
          email: user.email,
          tenantId: profile.tenantId,
        },
      },
    })

    const token = await reply.jwtSign({
      sub: user.id,
      email: user.email,
      name: user.displayName,
      userType: user.userType,
    })

    reply.setCookie('dhcloud_session', token, {
      ...fastify.microsoftAuth.getCookieOptions(),
      httpOnly: true,
      maxAge: 60 * 60 * 8,
    })

    const redirectTarget = fastify.microsoftAuth.getPostLoginRedirect(request) || fastify.config.STAFF_PORTAL_URL
    fastify.microsoftAuth.clearHandshakeCookies(reply)

    return reply.redirect(redirectTarget)
  })

  fastify.get('/v1/auth/session', { preHandler: fastify.authenticate }, async (request) => ({
    authenticated: true,
    user: request.sessionUser,
  }))

  fastify.post('/v1/auth/logout', async (_request, reply) => {
    reply.clearCookie('dhcloud_session', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: fastify.config.NODE_ENV === 'production',
    })

    return {
      success: true,
    }
  })
}

export default authRoutes
