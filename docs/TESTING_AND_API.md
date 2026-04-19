# API handlers and test documentation

This document describes the Express **controller methods** (business logic behind HTTP routes), how they map to **routes**, and what the **Jest** suite verifies. For the public HTTP contract, see `openapi.yaml` where applicable.

## Running tests

```bash
npm test              # all tests once
npm test -- --watch   # optional: watch mode via jest
```

Requirements: Node 22+ (see `package.json` `engines`). TMDB-related tests stub `global.fetch` and manipulate `process.env` per test; they do not call the real TMDB network.

## Jest configuration (summary)

| Setting | Purpose |
|--------|---------|
| `preset: 'ts-jest'` | TypeScript tests |
| `testEnvironment: 'node'` | Express / `supertest` (no browser DOM) |
| `roots: ['<rootDir>/tests']` | Tests live under `tests/` |
| `testMatch: ['**/*.test.ts']` | Only `*.test.ts` files |
| `moduleNameMapper` → `tests/__mocks__/scalarMock.cjs` | Replaces `@scalar/express-api-reference` so `app` loads without the real Scalar middleware |

---

## Route map

Base paths are mounted in `src/routes/index.ts`:

| Mount path | Router file | Notes |
|------------|-------------|--------|
| `/heartbeat` | `src/routes/heartbeat.ts` | Single GET |
| `/movies` | `src/routes/movies.ts` | Order: `/`, `/popular`, `/:id` |
| `/shows` | `src/routes/shows.ts` | Order: `/`, `/popular`, `/:id` |

Additional routes on `app` (`src/app.ts`): `GET /openapi.json` (parsed YAML spec), `GET /api-docs` (Scalar; under Jest the module mock calls `next()` only, so the request falls through to the global 404 handler).

---

## Controller methods (`src/controllers`)

### `getHeartbeat` — `src/controllers/heartbeat.ts`

| Item | Detail |
|------|--------|
| **Route** | `GET /heartbeat` → `heartbeatRouter.get('/', getHeartbeat)` |
| **Purpose** | Liveness check for monitoring or smoke tests |
| **Upstream** | None |
| **Response** | `200` JSON `{ status: 'The server is alive and running.' }` |

---

### `searchMovies` — `src/controllers/movies.ts`

| Item | Detail |
|------|--------|
| **Route** | `GET /movies?title=...` |
| **Purpose** | Search movies via TMDB `GET /3/search/movie` |
| **Auth** | `TMDB_BEARER_TOKEN` required (Bearer header) |
| **Validation** | Missing `title` → `400` `{ error: 'Title is required' }` |
| **Errors** | No token → `500`; TMDB non-OK → forwards TMDB status + `{ error: 'TMDB API error', status: '...' }`; `fetch` throws → `502` `{ error: 'Failed to reach TMDB service' }` |
| **Success** | Non-empty results → array of `{ title, poster, releaseDate, description, id }`; empty results → `200` `{ message: 'No movies found with title: <title>' }` |

---

### `getMovieDetails` — `src/controllers/movies.ts`

| Item | Detail |
|------|--------|
| **Route** | `GET /movies/:id` |
| **Purpose** | Movie detail via TMDB `GET /3/movie/{id}` |
| **Auth** | `TMDB_BEARER_TOKEN` required |
| **Validation** | Missing `id` → `400` `{ error: 'ID required' }` |
| **Errors** | No token → `500`; TMDB non-OK → TMDB status + API error body; network → `502` |
| **Success** | `200` JSON with TMDB-shaped fields: `title`, `poster_path`, `release_date`, `overview`, `revenue`, `runtime`, `budget` |

---

### `getPopularMovies` — `src/controllers/movies.ts`

| Item | Detail |
|------|--------|
| **Route** | `GET /movies/popular` |
| **Purpose** | Top 10 English popular movies from TMDB discover |
| **Auth** | `TMDB_BEARER_TOKEN` required |
| **Errors** | No token → `500`; TMDB non-OK → forwards status; network → `502` |
| **Success** | `200` `{ count: 10, results: [{ movieId }, ...] }` (first 10 of discover page) |

---

### `getTmdbAuth` (internal) — `src/controllers/shows.ts`

| Item | Detail |
|------|--------|
| **Purpose** | Shared helper for show routes that support **either** bearer **or** v3 API key |
| **Behavior** | If `TMDB_BEARER_TOKEN` is set → headers include `Authorization: Bearer …`, no `api_key` in URL. Else → JSON content-type only; caller appends `api_key` via `URLSearchParams` when `TMDB_API_KEY` is set |

---

### `searchShows` — `src/controllers/shows.ts`

| Item | Detail |
|------|--------|
| **Route** | `GET /shows?title=...` |
| **Purpose** | TV search via TMDB `GET /3/search/tv` |
| **Auth** | Requires `TMDB_BEARER_TOKEN` **or** `TMDB_API_KEY` (see `getTmdbAuth`) |
| **Validation** | Missing / empty / whitespace-only `title` → `400` `{ error: 'Query parameter title is required' }` |
| **Errors** | Neither auth configured → `500` `{ error: 'TMDB authentication is not configured' }`; TMDB non-OK → `500` `{ error: 'TMDB API error' }`; `fetch` throws → `500` `{ error: 'Failed to reach TMDB service' }` |
| **Success** | `200` JSON array of `{ id, title, posterImage, releaseDate, shortDescription, genreIds }` (normalized from TMDB `name`, `poster_path`, etc.); no matches → `[]` |

---

### `getShowById` — `src/controllers/shows.ts`

| Item | Detail |
|------|--------|
| **Route** | `GET /shows/:id` |
| **Purpose** | TV series detail via TMDB `GET /3/tv/{id}` |
| **Auth** | Same as `searchShows` (bearer or `api_key` query param) |
| **Validation** | Empty `id` param → `400` `{ error: 'Show id is required' }` |
| **Errors** | No auth → `500`; TMDB non-OK → HTTP status forwarded with `{ error: 'TMDB API error', status: '...' }`; `fetch` throws → `500` |
| **Success** | `200` JSON: `id`, `title`, `posterImage`, `releaseDate`, `shortDescription`, `revenue`, `budget` (typed from `TMDBTVDetailsApi` in `src/types/tmdb.ts`, plus `id` on the parsed payload) |
| **Tests** | `tests/show.details.test.ts` |

---

### `getPopularShows` — `src/controllers/shows.ts`

| Item | Detail |
|------|--------|
| **Route** | `GET /shows/popular` |
| **Purpose** | Top 10 English popular TV series from TMDB discover TV |
| **Auth** | `TMDB_BEARER_TOKEN` only (no API-key fallback in this handler) |
| **Errors** | No token → `500`; TMDB non-OK → forwards TMDB status; network → `502` |
| **Success** | `200` `{ count: 10, results: [{ showId }, ...] }` |

---

## Test files (`tests/`)

### `heartbeat.test.ts`

| Test | What it verifies |
|------|------------------|
| `GET /heartbeat — returns server alive message` | Status `200` and body `status` equals the heartbeat string |

---

### `movie.test.ts`

#### Describe: `Movie Search Route`

| Test | What it verifies |
|------|------------------|
| `GET /movies returns 400 when title query is missing` | `400`, `{ error: 'Title is required' }` |
| `GET /movies returns 500 when token is missing` | No `TMDB_BEARER_TOKEN` → `500`, token error message |
| `GET /movies forwards TMDB status when search response is not ok` | Mock `fetch` returns `ok: false`, `401` → response status `401` and TMDB error payload shape |
| `GET /movies returns message when TMDB returns no results` | Empty `results` → `200` and `message` object with title echoed |
| `GET /movies returns transformed movie list when TMDB returns results` | Mapping to `poster`, `releaseDate`, `description`, `id`; URL contains `/search/movie` and query |
| `GET /movies returns 502 when fetch rejects` | Rejected `fetch` → `502` network error body |

#### Describe: `Movie Details Route`

| Test | What it verifies |
|------|------------------|
| `GET /movies/:id returns 500 when token is missing` | Missing env token |
| `GET /movies/:id forwards TMDB status when detail response is not ok` | e.g. `404` from TMDB |
| `GET /movies/:id returns transformed movie when TMDB returns ok` | Full detail object; fetch URL matches `/movie/{id}` |
| `GET /movies/:id returns 502 when fetch rejects` | Network failure path |

#### Describe: `Movie Popular Route`

| Test | What it verifies |
|------|------------------|
| `GET /movies/popular returns transformed top 10 movie list` | 12 mocked results → response has `count` 10, first item `movieId` |
| `GET /movies/popular returns 500 when token is missing` | Config error |
| `GET /movies/popular forwards TMDB status when discover response is not ok` | TMDB `503` → same status + `status` / `error` body |
| `GET /movies/popular returns 502 when fetch rejects` | Network failure |

**Shared setup:** `beforeEach` sets `TMDB_BEARER_TOKEN`; `afterEach` restores env and `global.fetch`, `jest.restoreAllMocks()`.

---

### `show.search.test.ts`

#### Describe: `Show Search Route (GET /shows)`

| Test | What it verifies |
|------|------------------|
| `returns 400 when title query is missing` | No `title` query param |
| `returns 400 when title is empty or whitespace` | `title=` and `title='   '` |
| `returns 500 when neither bearer token nor API key is configured` | Both env vars cleared |
| `returns 500 when TMDB responds with a non-success status` | TMDB `401` → **always** `500` + `TMDB API error` (shows search does not forward status) |
| `returns 500 when fetch rejects` | Network error |
| `returns an empty array when TMDB returns no TV results` | `200` + `[]` |
| `returns transformed shows when TMDB returns results` | Normalized fields, poster URL prefix, fetch URL has `query`, `language`, Bearer header |
| `uses TMDB_API_KEY query param when bearer token is not set` | URL contains `api_key`, headers without `Authorization` |
| `encodes special characters in the search title for the TMDB query` | Title `a&b=c` appears URL-encoded in the request URL |

**Shared setup:** Default `TMDB_BEARER_TOKEN = 'test-bearer'`, `TMDB_API_KEY` deleted unless a test needs key-only auth; fetch restored after each test.

---

### `show.popular.test.ts`

#### Describe: `Show Popular Route`

| Test | What it verifies |
|------|------------------|
| `GET /shows/popular returns transformed top 10 show list` | Mock 12 TV rows → `count` 10, `showId` on first element |
| `GET /shows/popular returns 500 when token is missing` | Missing bearer |
| `GET /shows/popular forwards TMDB status when discover response is not ok` | TMDB `401` → `{ error: 'TMDB API error' }` (no `status` text field on this handler) |
| `GET /shows/popular returns 502 when fetch rejects` | Network failure |

**Shared setup:** Same pattern as movie popular (token + fetch restore).

---

### `show.details.test.ts`

#### Describe: `Show Details Route (GET /shows/:id)`

| Test | What it verifies |
|------|------------------|
| `returns 500 when neither bearer token nor API key is configured` | Same auth rule as show search |
| `forwards TMDB status when detail response is not ok` | e.g. `404` + `status` / `error` body |
| `returns transformed show when TMDB returns ok` | Normalized body, `/tv/{id}` URL, Bearer headers |
| `handles null poster path` | `posterImage` is `null` |
| `uses TMDB_API_KEY query param when bearer token is not set` | URL `api_key`, plain JSON headers |
| `returns 500 when fetch rejects` | Network failure (shows detail uses `500`, not `502`) |
| `encodes the id segment in the TMDB URL` | Path contains `/tv/55` |

---

### `app.routes.test.ts`

| Describe / test | What it verifies |
|-----------------|------------------|
| `OpenAPI spec route` → `GET /openapi.json returns parsed OpenAPI document` | `200`, JSON body with `openapi`, `info`, `paths` |
| `API docs mount` → `GET /api-docs falls through Scalar mock to 404 handler` | With Jest’s Scalar stub, `404` + `{ error: 'Route not found' }` |
| `Global 404 handler` → `returns JSON for unknown paths` | Unregistered path → `404` + route-not-found body |

---

## Test coverage notes

- **Movie search vs show search** — movie forwards TMDB HTTP status on error; show search always returns `500` on TMDB error. Tests document this divergence.
- **`GET /api-docs` in production** serves Scalar UI; tests only reflect the **mock** middleware behavior.

---

## Related files

| File | Role |
|------|------|
| `src/app.ts` | Express app used by `supertest` |
| `src/types/tmdb.ts` | Type aliases for TMDB JSON shapes used in controllers |
| `tests/__mocks__/scalarMock.cjs` | No-op middleware substitute for Scalar in tests |
