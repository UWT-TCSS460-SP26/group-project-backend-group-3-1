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

| Variable       | Description                                         | Example                                        |
| -------------- | --------------------------------------------------- | ---------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                        | `postgresql://user:pass@localhost:5432/group3` |
| `AUTH_ISSUER`  | Auth² issuer (JWT `iss`)                            | `https://tcss-460-iam.onrender.com`            |
| `API_AUDIENCE` | Expected JWT `aud` claim                            | `group-3-api`                                  |
| `CORS_ORIGINS` | Comma-separated allowed browser origins (see below) | `http://localhost:3000` |
| `PORT`         | HTTP port (optional)                                | `3000`                  |

---

## CORS allowlist

Browser clients may only call this API from origins listed in `CORS_ORIGINS`. The backend reads that variable at startup and applies it via Express CORS middleware.

**Local development:** Run your frontend on **`http://localhost:3000`** so it can access this backend. Set `CORS_ORIGINS=http://localhost:3000` in `.env` for local work.

**Need another origin allowlisted?** Submit a [bug report](#filing-bug-reports) with the URL you need. We will add it to `CORS_ORIGINS` on deploy.

The API allows `Authorization` and `Content-Type` in CORS preflight and supports credentials, so authenticated browser calls from allowlisted origins work without extra client changes.

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
4. For browser apps during local dev, run the frontend on **`http://localhost:3000`** (see [CORS allowlist](#cors-allowlist)). Request other origins via a bug report.
5. **401** — missing/invalid/expired token. **403** — authenticated but insufficient app role (check local `User.role` for that `sub`).

Public routes (no token): e.g. **GET** `/heartbeat`, **POST** `/issues` (create bug report). Most ratings/reviews routes require auth; see OpenAPI for each operation.

### Filing bug reports

- **UI:** [Bug tracker frontend](https://group-project-bug-tracker-front-end-group-3-9dhrg5gp7.vercel.app)
- **API:** **POST** `/issues` with JSON body (`issueStatus`, `issueDesc`) — no auth required to submit
- **Admin triage:** **GET** / **PATCH** / **DELETE** `/issues` require a token and database role `Admin` (see OpenAPI)

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

## Team

**Group 3** — TCSS 460 group project backend.
