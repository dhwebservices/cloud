# DH Cloud

DH Cloud is the central backend platform for:

- the DH staff portal
- the DH client portal
- the DH website

It provides one shared API, one shared PostgreSQL database, Microsoft login for staff, and a clean place for shared business logic, permissions, notifications, and audit trails.

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

## Main routes

- `GET /` service info
- `GET /health` health check
- `GET /v1/auth/session` current signed-in session
- `POST /v1/auth/logout` clear session
- `GET /v1/auth/microsoft/start` start Microsoft sign-in
- `GET /v1/auth/microsoft/callback` handle Microsoft callback

## Next recommended steps

- connect the staff portal to session-based API auth
- add RBAC and permission policies by app/domain
- add client auth flow for the client portal
- add domain modules for staff, clients, recruiting, notifications, and website content

