# DH Cloud

DH Cloud is the central backend platform for:

- the DH staff portal
- the DH client portal
- the DH website

It provides one shared API, one shared PostgreSQL database, Microsoft login for staff, and a clean place for shared business logic, permissions, notifications, and audit trails.

## Project intent

This repo exists to become the shared backend for the DH platform, instead of keeping portal logic spread across frontend apps.

The target model is:

- `staff` app for internal staff operations
- `client` app for client-facing portal access
- `website` app for public website and lead capture
- one shared API and one shared database underneath all three

That means DH Cloud should eventually own:

- authentication
- session management
- RBAC / permissions
- shared users and organizations
- staff records
- client records
- recruiting, notifications, and audit logging
- reusable business logic used by multiple DH apps

## Current status

This is the first backend foundation pass. The repo now has:

- a working Fastify server scaffold
- typed app/config/plugin structure
- Prisma wired for PostgreSQL
- initial shared schema for users, organizations, memberships, staff profiles, client accounts, refresh sessions, and audit logs
- Microsoft Entra login foundation for staff sign-in
- JWT cookie session handling
- health and auth session endpoints

This repo is not yet production-ready, but it is now a real backend starting point rather than an empty repo.

## Stack

- Fastify
- TypeScript
- Prisma
- PostgreSQL
- Microsoft Entra ID / OAuth for staff login

## What is included

- typed Fastify server scaffold
- Prisma schema for shared DH platform data
- Microsoft auth foundation with secure state/nonce cookies
- JWT session cookie issuance after Microsoft sign-in
- health and session endpoints
- modular route/plugin structure

## Architecture direction

Planned app flow:

```text
DH Website
DH Staff Portal
DH Client Portal
        ↓
      DH Cloud API
        ↓
   PostgreSQL database
        ↓
 storage / email / jobs / audit / notifications
```

The intention is that frontend apps stop talking directly to database tables for protected actions. Instead:

1. the frontend authenticates through DH Cloud
2. DH Cloud checks identity and permissions
3. DH Cloud reads/writes the database
4. DH Cloud returns only the allowed data for that app/user

## Current auth flow

The current scaffold is built around Microsoft login for staff:

1. user hits `GET /v1/auth/microsoft/start`
2. DH Cloud creates secure `state` and `nonce` cookies
3. user is redirected to Microsoft Entra ID
4. Microsoft redirects back to `GET /v1/auth/microsoft/callback`
5. DH Cloud validates `state`, `nonce`, and the Microsoft ID token
6. DH Cloud upserts the internal user + Microsoft identity record
7. DH Cloud issues a signed session cookie
8. frontend can call `GET /v1/auth/session`

Right now this is scaffolded and coded, but it still needs real Entra credentials and a live database to be fully usable.

## Current data model

The first Prisma schema includes:

- `User`
- `IdentityProviderAccount`
- `Organization`
- `Membership`
- `StaffProfile`
- `ClientAccount`
- `RefreshSession`
- `AuditLog`

This is the shared core, not the final full schema.

Planned next schema areas:

- staff permissions / roles
- notifications
- recruiting
- support tickets
- tasks
- website enquiries / lead capture
- documents / file references
- client portal resources

## Repo structure

```text
prisma/
  schema.prisma

src/
  app.ts
  server.ts
  config/
  plugins/
  routes/
  services/
  types/
```

## Important setup still needed

Before DH Cloud can actually be used for live login and real app traffic, it still needs:

1. a PostgreSQL database
2. a real `.env` with secure values
3. a Microsoft Entra app registration
4. the redirect URI registered in Entra
5. the first Prisma migration applied

Microsoft values required:

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI`

Core platform values required:

- `DATABASE_URL`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `APP_BASE_URL`
- app URLs for staff/client/website

## What the next chat should know

If a new chat picks this repo up, the important context is:

- this repo is meant to be the shared backend for the DH ecosystem
- the name must stay `DH Cloud`
- staff login should use Microsoft Entra ID
- the goal is one backend and one database for staff portal, client portal, and website
- current work is only the backend foundation, not the full product
- the next sensible implementation steps are auth hardening, RBAC, migrations, and real domain modules

## Recommended next steps

Best order from here:

1. create the Microsoft Entra app registration
2. provision the PostgreSQL database
3. add and run the first Prisma migration
4. add RBAC models and middleware
5. add `staff` domain endpoints first
6. connect the existing staff portal to DH Cloud auth/session endpoints
7. add client auth and client portal endpoints
8. add website endpoints for public forms, leads, and content actions

## Quick start

1. Copy `.env.example` to `.env`
2. Set a working PostgreSQL `DATABASE_URL`
3. Add Microsoft Entra app credentials
4. Install dependencies:

```bash
npm install
```

5. Generate Prisma client:

```bash
npm run prisma:generate
```

6. Run database migrations:

```bash
npm run prisma:migrate
```

7. Start the server:

```bash
npm run dev
```

## Railway deploy

DH Cloud is best deployed as a normal backend service on Railway.

Railway's own Fastify guide says to deploy from a GitHub repo and notes that Fastify should listen on `::` so the service is reachable over Railway's public and private network ([Railway Fastify guide](https://docs.railway.com/guides/fastify)).

Railway's PostgreSQL docs say you can add a Postgres service from the project canvas and connect to it using the provided `DATABASE_URL` and other Postgres env vars ([Railway PostgreSQL docs](https://docs.railway.com/databases/postgresql)).

Recommended Railway setup for this repo:

- Source repo: `dhwebservices/cloud`
- Branch: `main`
- Build command: `npm run check`
- Start command: `npm run start`

Recommended service variables:

- `NODE_ENV=production`
- `APP_NAME=DH Cloud`
- `HOST=::`
- `PORT=4000`
- `APP_BASE_URL=https://<your-railway-domain-or-api-domain>`
- `WEBSITE_URL=https://<your-website-domain>`
- `STAFF_PORTAL_URL=https://staff.dhwebsiteservices.co.uk`
- `CLIENT_PORTAL_URL=https://<your-client-portal-domain>`
- `JWT_SECRET=<long-random-secret>`
- `COOKIE_SECRET=<different-long-random-secret>`
- `MICROSOFT_TENANT_ID=<entra-tenant-id>`
- `MICROSOFT_CLIENT_ID=<entra-client-id>`
- `MICROSOFT_CLIENT_SECRET=<entra-client-secret>`
- `MICROSOFT_REDIRECT_URI=https://<your-railway-domain-or-api-domain>/v1/auth/microsoft/callback`
- `MICROSOFT_ALLOWED_TENANT_ID=<optional-tenant-lock>`

Database variable:

- `DATABASE_URL` should come from the Railway PostgreSQL service

Railway's variables docs note that service variables are configured in the service's Variables tab and are available both at build time and runtime ([Railway variables docs](https://docs.railway.com/variables)).

## Main routes

- `GET /` service info
- `GET /health` health check
- `GET /v1/auth/session` current signed-in session
- `POST /v1/auth/logout` clear session
- `GET /v1/auth/microsoft/start` start Microsoft sign-in
- `GET /v1/auth/microsoft/callback` handle Microsoft callback

## Handoff note

If work continues in another chat, start by reading this README and then inspect:

- [`/Users/david/Downloads/cloud/prisma/schema.prisma`](/Users/david/Downloads/cloud/prisma/schema.prisma)
- [`/Users/david/Downloads/cloud/src/routes/auth.ts`](/Users/david/Downloads/cloud/src/routes/auth.ts)
- [`/Users/david/Downloads/cloud/src/services/microsoft-auth.ts`](/Users/david/Downloads/cloud/src/services/microsoft-auth.ts)
- [`/Users/david/Downloads/cloud/src/app.ts`](/Users/david/Downloads/cloud/src/app.ts)

Those files describe the current backend foundation and where the next work should continue.
