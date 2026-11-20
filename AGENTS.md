# AGENTS.md

paws puts TheCatAPI and TheDogAPI behind one Express api, with an MCP server and a web app in front.
Each package's README covers setup, scripts, routes and architecture. Read the README for the
package you're changing before you start.

| Folder | What it is | Package manager |
| --- | --- | --- |
| `api/` | Express 5 + TypeScript service that aggregates the two upstream APIs | pnpm |
| `mcp-server/` | stdio MCP server. Each tool calls one api endpoint; it has no pet logic of its own | pnpm |
| `web/` | Vite + React scaffold, not wired to the api yet | npm (`package-lock.json`) |

There's no root `package.json` or workspace. Each package installs and runs on its own, so run
commands from inside the package's folder.

## Workflow

- Do each piece of work on its own branch off `main`, then open a PR into `main`.
- Use Conventional Commits for commit messages and PR titles (`feat:`, `fix:`, `docs:`, `refactor:`,
  `test:`, `chore:`). Fix things with new commits; existing commits stay as they are.
- While iterating on small tweaks, make the edits and commit only once the user says the tweaks are
  done.
- PR bodies follow `.github/pull_request_template.md`: Why / Related Issue, What changed, Testing.
  Under Testing, list the commands you ran.

## Verifying a change

Before committing, run these in every package you touched. A change is done when all of them pass.
CI (`.github/workflows/ci.yml`) runs the same commands on every PR, one job per package, so keep the
two lists in sync:

- `api/`: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`
- `mcp-server/`: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- `web/`: `npm run lint && npm run build` (no tests yet)

The test suites never call the real upstreams and don't need API keys or a running api.

## Tests

- Vitest. Each spec imports what it uses (`describe`, `it`, `expect`, `vi`) from `'vitest'`; there
  are no globals. Unit tests live next to their source as `*.spec.ts`.
- Vitest only strips types and doesn't check them, so `pnpm typecheck` is what catches type errors
  in specs (`pnpm build` excludes them).
- Unit tests wire the class under test by hand, through a local `setup()` helper, and pass
  `vi.fn()` fakes for its collaborators (e.g. `{ get: vi.fn() }` as the `HttpClient`). There's no
  DI container to mock.
- api e2e tests live in `api/test/*.e2e-spec.ts`, as a separate Vitest project (see
  `api/vitest.config.mts`). They use supertest against `createApp()`, with
  `global.fetch` replaced by `installFetchMock()` from `api/test/support/fake-upstream.ts`. If you
  add a call to a new upstream path, add a matching case to the fake.
- mcp-server: `src/tools/tools.spec.ts` calls every tool through an in-memory MCP client. Its
  `WIRING` table maps each tool to the `PawsApiClient` method it must call, so give every new tool a
  row there.

## Code conventions

- **api layers:** thin routes (zod-validated `req.query`) → services → repositories → `HttpClient`.
  Repositories are the only code that knows upstream paths and JSON shapes. `app.ts` wires
  everything together by hand, and `main.ts` is the only caller of `.listen()`.
- **Cats and dogs mirror each other.** That goes for `modules/cats` ↔ `modules/dogs` in the api and
  `cat-tools.ts` ↔ `dog-tools.ts` in the MCP server. When you change one species, make the matching
  change to the other.
- **Adding or changing an api route** touches several places, all in the same change:
  - the route and its service
  - the OpenAPI document in `api/src/docs/openapi.ts`
  - the e2e tests
  - `PawsApiClient`, the tool and its `WIRING` row in `mcp-server/`
  - the route and tool tables in the READMEs
- **Errors:** throw the `HttpError` family from `api/src/common/errors/http-error.ts`. Upstream
  failures become `ExternalApiError` (502, or 504 on timeout); the upstream's own status never
  reaches the caller. An unknown breed id is the exception and becomes a 404. Optional lookups such
  as breed photos go through `bestEffort()`.
- **Config:** environment variables are validated with zod in each package's `src/config/env.ts`,
  and an empty value counts as unset. When you add a variable, also add it to `.env.template` and
  the README's variable table.
- **Imports:** mcp-server's relative imports end in `.js` (`'./tool-result.js'`). api's relative
  imports have no extension.
- **mcp-server output:** stdout carries the MCP protocol, so logging goes to stderr
  (`console.error`).
- **Formatting:** Prettier with single quotes and trailing commas (see each package's `.prettierrc`).
