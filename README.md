# TCSS 460 — Group 3 Backend API

Express + TypeScript API for the TCSS 460 group project (**Group 3**).

Use **GET /heartbeat** to confirm the service is up (no auth, no database). Interactive API reference lives at `/api-docs`.

---

## Live URLs

| Resource                   | URL                                                                      |
| -------------------------- | ------------------------------------------------------------------------ |
| **Production API**         | https://group-project-backend-group-3-1.onrender.com                     |
| **OpenAPI spec**           | https://group-project-backend-group-3-1.onrender.com/openapi.json        |
| **API docs (Scalar)**      | https://group-project-backend-group-3-1.onrender.com/api-docs            |
| **Bug tracker (frontend)** | https://group-project-bug-tracker-front-end-group-3-9dhrg5gp7.vercel.app |

**Local development:** `http://localhost:3000` (same paths as production).

---

## Quick start

**Requirements:** Node.js ≥ 22, PostgreSQL (or Docker via `db:setup`).

```bash
# Install dependencies
npm install

# Create .env (see Environment variables below)
cp .env.example .env   # if present; otherwise create .env manually

# Database
npx prisma migrate deploy
npx prisma generate

# Run (auto-reload)
npm run dev
```

One-shot local DB setup (Docker + migrate + seed):

```bash
npm run db:setup
```

---

## Environment variables

Create a `.env` file in the project root:

| Variable       | Description                             | Example                                        |
| -------------- | --------------------------------------- | ---------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string            | `postgresql://user:pass@localhost:5432/group3` |
| `AUTH_ISSUER`  | Auth² issuer (JWT `iss`)                | `https://tcss-460-iam.onrender.com`            |
| `API_AUDIENCE` | Expected JWT `aud` claim                | `group-3-api`                                  |
| `CORS_ORIGINS` | Comma-separated allowed browser origins | `http://localhost:3000`                        |
| `PORT`         | HTTP port (optional)                    | `3000`                                         |

**CORS:** For local frontends, set `CORS_ORIGINS=http://localhost:3000`. The API accepts `Authorization` and `Content-Type` headers and supports credentials. Add production front-end URLs to the same list when deploying.

---

## Authentication

### How it works

1. **Auth²** mints JWT access tokens (this API does **not** issue tokens).
2. **`requireAuth`** verifies the token (RS256, issuer JWKS) and sets `request.user` from claims (`sub`, `role`, etc.).
3. **App permissions** (e.g. Admin) come from the **local database** `User.role`, keyed by JWT `sub` → `User.subjectId` — not from the JWT `role` claim alone.

First authenticated request may create a local user via `resolveLocalUser` (default role `User`). Promote admins in the database:

```sql
UPDATE "User" SET role = 'Admin' WHERE "subjectId" = '<jwt-sub>';
```

Admin-gated routes (e.g. issue list/update/delete) use `requireDbRoleAtLeast('Admin')` after `requireAuth`.

---

## Getting a token

Mint an access token at the course **Token Playground** using **this group’s audience**.

| Setting        | Value                                                                            |
| -------------- | -------------------------------------------------------------------------------- |
| **Playground** | https://tcss460-token-playground.onrender.com/                                   |
| **Issuer**     | `https://tcss-460-iam.onrender.com`                                              |
| **Audience**   | `group-3-api` (**required** — the API rejects tokens with any other `aud` claim) |
| **Algorithm**  | RS256 (verified against the issuer’s JWKS)                                       |

### Using the token

Pass the token on every protected request:

```http
Authorization: Bearer <token>
```

Example with `curl`:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://group-project-backend-group-3-1.onrender.com/issues
```

This API never mints tokens — token issuance is owned entirely by Auth².

---

## Integrating from another team

1. Read the contract: **GET** `/openapi.json` or browse `/api-docs`.
2. Obtain a token from the playground with audience **`group-3-api`**.
3. Call the API with `Authorization: Bearer <token>`.
4. For browser apps, ensure your origin is listed in `CORS_ORIGINS` (e.g. `http://localhost:3000` for local dev).
5. **401** — missing/invalid/expired token. **403** — authenticated but insufficient app role (check local `User.role` for that `sub`).

Public routes (no token): e.g. **GET** `/heartbeat`, **POST** `/issues` (create bug report). Most ratings/reviews routes require auth; see OpenAPI for each operation.

---

## npm scripts

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Dev server with auto-reload (`tsx watch`)   |
| `npm run build`       | Generate Prisma client + compile to `dist/` |
| `npm start`           | Run compiled production build               |
| `npm test`            | Run Jest tests                              |
| `npm run lint`        | ESLint                                      |
| `npm run format`      | Prettier write                              |
| `npm run db:setup`    | Docker Postgres + migrate + generate + seed |
| `npm run prisma:seed` | Seed database                               |

---

## Project layout (high level)

| Path                            | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `src/routes/`                   | Express routers                               |
| `src/middleware/requireAuth.ts` | JWT verification + DB role gates              |
| `src/auth/resolveLocalUser.ts`  | Upsert local `User` from JWT `sub`            |
| `openapi.yaml`                  | API contract (also served at `/openapi.json`) |
| `prisma/`                       | Schema and migrations                         |

---

## Team

**Group 3** — TCSS 460 group project backend.
