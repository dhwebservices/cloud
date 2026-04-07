import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('DH Cloud'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_BASE_URL: z.string().url(),
  WEBSITE_URL: z.string().url(),
  STAFF_PORTAL_URL: z.string().url(),
  CLIENT_PORTAL_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  MICROSOFT_TENANT_ID: z.string().min(1),
  MICROSOFT_CLIENT_ID: z.string().min(1),
  MICROSOFT_CLIENT_SECRET: z.string().min(1),
  MICROSOFT_REDIRECT_URI: z.string().url(),
  MICROSOFT_ALLOWED_TENANT_ID: z.string().optional().default(''),
})

export type AppConfig = z.infer<typeof envSchema>

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(source)
}

