import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { randomBytes } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AppConfig } from '../config/env.js'

type DiscoveryDocument = {
  authorization_endpoint: string
  token_endpoint: string
  issuer: string
  jwks_uri: string
}

export type MicrosoftProfile = {
  microsoftUserId: string
  tenantId: string
  email: string
  displayName: string
  givenName: string
  familyName: string
  preferredUsername: string
  raw: JWTPayload
}

export type SessionUser = {
  id: string
  email: string
  name: string
  userType: string
}

const STATE_COOKIE = 'dhcloud_ms_state'
const NONCE_COOKIE = 'dhcloud_ms_nonce'

export class MicrosoftAuthService {
  private readonly discoveryUrl: string
  private discovery?: DiscoveryDocument

  constructor(private readonly config: AppConfig) {
    this.discoveryUrl = `https://login.microsoftonline.com/${config.MICROSOFT_TENANT_ID}/v2.0/.well-known/openid-configuration`
  }

  async getDiscovery(): Promise<DiscoveryDocument> {
    if (this.discovery) return this.discovery

    const response = await fetch(this.discoveryUrl)
    if (!response.ok) {
      throw new Error(`Could not load Microsoft discovery document (${response.status})`)
    }

    this.discovery = await response.json() as DiscoveryDocument
    return this.discovery
  }

  async createAuthorizationUrl(request: FastifyRequest, reply: FastifyReply): Promise<string> {
    const discovery = await this.getDiscovery()
    const state = randomBytes(24).toString('hex')
    const nonce = randomBytes(24).toString('hex')

    reply.setCookie(STATE_COOKIE, state, this.getCookieOptions())
    reply.setCookie(NONCE_COOKIE, nonce, this.getCookieOptions())

    const url = new URL(discovery.authorization_endpoint)
    url.searchParams.set('client_id', this.config.MICROSOFT_CLIENT_ID)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('redirect_uri', this.config.MICROSOFT_REDIRECT_URI)
    url.searchParams.set('response_mode', 'query')
    url.searchParams.set('scope', 'openid profile email User.Read')
    url.searchParams.set('state', state)
    url.searchParams.set('nonce', nonce)

    const redirectTo = typeof request.query === 'object' && request.query && 'redirectTo' in request.query
      ? String(request.query.redirectTo || '').trim()
      : ''

    if (redirectTo) {
      url.searchParams.set('redirect_uri', this.config.MICROSOFT_REDIRECT_URI)
      reply.setCookie('dhcloud_post_login_redirect', redirectTo, this.getCookieOptions())
    }

    return url.toString()
  }

  assertCallbackState(request: FastifyRequest) {
    const queryState = typeof request.query === 'object' && request.query && 'state' in request.query
      ? String(request.query.state || '')
      : ''
    const cookieState = request.cookies[STATE_COOKIE]

    if (!queryState || !cookieState || queryState !== cookieState) {
      throw new Error('Microsoft sign-in state check failed.')
    }
  }

  async exchangeCodeForProfile(code: string, nonce: string): Promise<MicrosoftProfile> {
    const discovery = await this.getDiscovery()
    const response = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.MICROSOFT_CLIENT_ID,
        client_secret: this.config.MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.MICROSOFT_REDIRECT_URI,
      }),
    })

    if (!response.ok) {
      throw new Error(`Microsoft token exchange failed (${response.status})`)
    }

    const tokenSet = await response.json() as { id_token?: string }
    if (!tokenSet.id_token) {
      throw new Error('Microsoft did not return an ID token.')
    }

    const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri))
    const verified = await jwtVerify(tokenSet.id_token, jwks, {
      issuer: discovery.issuer,
      audience: this.config.MICROSOFT_CLIENT_ID,
    })

    if (verified.payload.nonce !== nonce) {
      throw new Error('Microsoft sign-in nonce check failed.')
    }

    const tenantId = String(verified.payload.tid || '')
    const allowedTenantId = String(this.config.MICROSOFT_ALLOWED_TENANT_ID || '').trim()
    if (allowedTenantId && tenantId && tenantId !== allowedTenantId) {
      throw new Error('This Microsoft tenant is not allowed for DH Cloud.')
    }

    const email = String(
      verified.payload.email ||
      verified.payload.preferred_username ||
      verified.payload.upn ||
      '',
    ).toLowerCase().trim()

    if (!email) {
      throw new Error('Microsoft account did not provide an email address.')
    }

    return {
      microsoftUserId: String(verified.payload.oid || verified.payload.sub || ''),
      tenantId,
      email,
      displayName: String(verified.payload.name || email),
      givenName: String(verified.payload.given_name || ''),
      familyName: String(verified.payload.family_name || ''),
      preferredUsername: String(verified.payload.preferred_username || email),
      raw: verified.payload,
    }
  }

  clearHandshakeCookies(reply: FastifyReply) {
    for (const key of [STATE_COOKIE, NONCE_COOKIE, 'dhcloud_post_login_redirect']) {
      reply.clearCookie(key, this.getCookieOptions())
    }
  }

  getNonce(request: FastifyRequest): string {
    return String(request.cookies[NONCE_COOKIE] || '')
  }

  getPostLoginRedirect(request: FastifyRequest): string {
    return String(request.cookies.dhcloud_post_login_redirect || '')
  }

  getCookieOptions() {
    const isProduction = this.config.NODE_ENV === 'production'
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: isProduction,
      path: '/',
    }
  }
}

