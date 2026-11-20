# paws-api

Aggregates [TheCatAPI](https://docs.thecatapi.com/reference) and
[TheDogAPI](https://docs.thedogapi.com/reference) into one API: per-species endpoints for cats and
dogs, plus "fun aggregate" endpoints that combine both (breed comparisons, a stat showdown,
cross-species stats, paw-of-the-day). Plain Express + TypeScript (no NestJS or DI container) with
the layers you'd expect from a small backend service: repositories, services, routes, a
composition root, and error-handling middleware.

### Setup

```
pnpm install
source .env      # exports CAT_API_KEY / DOG_API_KEY / PORT (copy .env.template first)
pnpm dev
```

Server on http://localhost:3000 (override with `PORT`). TheCatAPI works without a key at a lower
rate limit, but TheDogAPI rejects most requests without one — get free keys at
https://thecatapi.com and https://thedogapi.com and put them in `.env` (see `.env.template`).
`.env` is a shell script (`export KEY=value`), sourced manually — there's no dotenv dependency.

Environment variables are validated at startup, and the server refuses to start (naming the bad
variable) if one is invalid. Empty values count as unset.

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `3000` | |
| `CAT_API_KEY` / `DOG_API_KEY` | — | a warning is logged if missing |
| `CAT_API_BASE_URL` / `DOG_API_BASE_URL` | `https://api.the{cat,dog}api.com/v1` | override to point at a proxy or mock |

### Scripts
- `pnpm dev` — run with reload (`pnpm start:debug` adds `--inspect`)
- `pnpm start` — run once with tsx (no reload)
- `pnpm build` / `pnpm start:prod` — compile to `dist/` and run it with node
- `pnpm lint` / `pnpm lint:fix`, `pnpm format`
- `pnpm typecheck` — type-check everything, specs included (Vitest itself skips type checking)
- `pnpm test` — unit tests: utils, TTL cache, config, `HttpClient`, `BreedRepository`, `PawsService`
  (`test:watch` / `test:cov` for watch mode and coverage)
- `pnpm test:e2e` — full HTTP surface, with `global.fetch` mocked (see `test/support/fake-upstream.ts`)
  so it never depends on the real upstream APIs or a live API key

### Architecture

```
src/
  common/
    breed-api/       # generic BreedRepository + createBreedRouter, shared by cats and dogs
    cache/           # TtlCache
    errors/          # HttpError, NotFoundError, ExternalApiError, bestEffort()
    http/            # HttpClient: base URL, API key header, timeouts, error mapping
    middleware/      # 404 + error-handling middleware
    utils/           # range parsing, daily/random picks, temperament parsing
    validation/      # zod query validation
  config/            # env loading + validation
  modules/
    cats/            # CatService (TheCatAPI) + thin repository/router bindings
    dogs/            # DogService (TheDogAPI) + thin repository/router bindings
    paws/            # PawsService composes CatService + DogService for cross-species endpoints
    health/
  docs/              # OpenAPI document + Swagger UI page
  app.ts             # builds and configures the Express app: wires repositories -> services -> routers
  main.ts            # entrypoint; the only caller of .listen()
```

- **Repository pattern** — a shared generic `BreedRepository` (`common/breed-api/`) is the only code
  that knows the upstream paths and JSON shapes; `CatRepository` / `DogRepository` just bind its
  types. It sits on a shared `HttpClient` (timeout + error normalization) and a `TtlCache` (breed
  lists are cached for an hour — they barely change, and it keeps requests under the free-tier rate
  limit). Base URLs come from `config/env.ts`.
- **Service layer** — `CatService` / `DogService` hold business logic and translate upstream quirks
  into a consistent surface (e.g. TheCatAPI returns `400 INVALID_DATA` for an unknown breed id,
  TheDogAPI returns `404`; both become a clean `404 Not Found` here). `PawsService` has no upstream
  knowledge at all — it only composes the two per-species services.
- **Routes** are thin Express routers; validation is a few `zod` schemas on `req.query`.
  Express 5 forwards rejected promises to the error middleware automatically, so handlers are plain
  `async` functions.
- **Composition root** (`app.ts`) does manual dependency injection — no DI framework needed
  at this size.

### Routes

**Health**
- `GET /health` — `{ status, uptime, timestamp }`

**Cats** (mounted at `/cats`)
- `GET /breeds` `?q=` — list breeds, or search by name
- `GET /breeds/:id` — a single breed (404 if unknown)
- `GET /breeds/:id/spotlight` — breed + a photo + a generated fun fact
- `GET /random` `?breedId=` — a random cat photo, optionally restricted to one breed
- `GET /of-the-day` — a featured breed that's stable all day (changes at UTC midnight)

**Dogs** (mounted at `/dogs`) — same shape as cats.

**Paws** (mounted at `/paws` — the fun cross-species aggregates)
- `GET /random-duo` — one random cat photo + one random dog photo
- `GET /compare` `?catBreedId=&dogBreedId=` — head-to-head: life span, weight, shared temperament traits
- `GET /showdown` — a random cat breed vs. a random dog breed, scored across 3 rounds
  (longevity, heft, temperament variety) with an overall winner
- `GET /stats` — aggregates across every catalogued breed: average life span, longest-lived breed,
  most common temperament trait, per species
- `GET /of-the-day` — alternates between a cat spotlight and a dog spotlight by date

**Schema / docs**
- `GET /openapi.json` — the OpenAPI 3.0 document (static; `servers` is the relative `/`, so it
  works on any host, including behind an HTTPS proxy)
- `GET /docs` — an interactive Swagger UI page that loads that document

### Errors
Endpoints go through a single global error-handling middleware (`src/common/middleware/error-handler.ts`)
to normalize responses, including `zod` validation failures and upstream API failures.

```json
{
  "statusCode": 404,
  "timestamp": "2026-08-07T12:00:00.000Z",
  "path": "/unknown",
  "message": "Cannot GET /unknown"
}
```

- `message` is a string array for query-validation (400) errors.
- Upstream failures are always reported as **502** (upstream error or unreachable) or **504**
  (upstream timeout), never by passing the upstream's own status through — an upstream 401 from a bad
  API key is the server's problem, not the caller's. The one exception is an unknown breed id, which
  becomes a 404.
- Breed photos in spotlights, of-the-day and showdown are best-effort: if the photo lookup fails,
  the response omits `image` and the failure is logged.
