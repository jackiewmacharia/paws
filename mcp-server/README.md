# paws-mcp

An [MCP](https://modelcontextprotocol.io) server that exposes [paws-api](../api)'s
cat, dog, and cross-species endpoints as tools an MCP client (Claude Desktop, Claude Code, etc.)
can call directly. It's a thin stdio server — it does no pet-data logic itself, it just fronts
a running paws-api instance.

```
MCP client  <--stdio-->  paws-mcp  --HTTP-->  paws-api  --HTTP-->  TheCatAPI / TheDogAPI
```

### Setup

The API (`../api`) must be running first:

```
cd ../api
pnpm install
source .env
pnpm dev
```

Then, in this directory:

```
pnpm install
pnpm build
```

Point your MCP client at `node dist/index.js`. The client launches the server with its own
environment, so configure it in the client's `env` block, not your shell. For Claude Code / Desktop,
add to its MCP config:

```json
{
  "mcpServers": {
    "paws-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/paws/mcp-server/dist/index.js"],
      "env": { "PAWS_API_URL": "http://localhost:3000" }
    }
  }
}
```

| Variable | Default | |
| --- | --- | --- |
| `PAWS_API_URL` | `http://localhost:3000` | must be an http(s) URL |
| `PAWS_API_REQUEST_TIMEOUT_MS` | `20000` | positive integer; keep it above the API's worst case (~16s) |

Both are validated at startup: the server refuses to start, naming the bad variable, if one is
invalid. Empty values count as unset. `.env` (copy `.env.template`) only applies when you run the
server yourself from a shell with `source .env`.

### Scripts
- `pnpm build` / `pnpm start:prod` — compile to `dist/` and run it with node
- `pnpm start` / `pnpm dev` — run with tsx (`dev` reloads on change); for manual testing — MCP
  clients should launch `dist/index.js`
- `pnpm lint` / `pnpm lint:fix`
- `pnpm test` — unit tests for the HTTP client, config, and tool wiring (an in-memory MCP client
  calls every tool against a fake API client; no real network or running API needed). `test:watch`
  for watch mode.

### Architecture

```
src/
  client/paws-api-client.ts     # the only file that knows paws-api's routes/URL shape
  config/env.ts                 # PAWS_API_URL / PAWS_API_REQUEST_TIMEOUT_MS
  tools/
    tool-result.ts              # shared success/error -> CallToolResult mapping
    cat-tools.ts                # list_cat_breeds, get_cat_breed, get_cat_spotlight, ...
    dog-tools.ts                # mirrors cat-tools.ts
    pets-tools.ts               # the cross-species aggregate tools
  resources.ts                  # exposes paws-api's /openapi.json as an MCP resource
  server.ts                     # composition root: wires client -> tools/resources onto McpServer
  index.ts                      # stdio transport entrypoint
```

`PawsApiClient` mirrors the same repository-style boundary paws-api itself uses for
TheCatAPI / TheDogAPI: a single class owns the HTTP calls and translates paws-api's error
envelope (`{ statusCode, message, ... }`) into a typed `PawsApiError`. Tool handlers never
call `fetch` directly — they go through this client and `withErrorHandling`, which turns any error
into an MCP `isError: true` tool result whose text includes the paws-api status (e.g.
`paws-api error (404): Cat breed 'nope' was not found`).

### Tools

| Tool | Route |
| --- | --- |
| `list_cat_breeds` / `list_dog_breeds` | `GET /{cats,dogs}/breeds?q=` |
| `get_cat_breed` / `get_dog_breed` | `GET /{cats,dogs}/breeds/:id` |
| `get_cat_spotlight` / `get_dog_spotlight` | `GET /{cats,dogs}/breeds/:id/spotlight` |
| `get_random_cat_image` / `get_random_dog_image` | `GET /{cats,dogs}/random?breedId=` |
| `get_cat_of_the_day` / `get_dog_of_the_day` | `GET /{cats,dogs}/of-the-day` |
| `get_random_pet_duo` | `GET /pets/random-duo` |
| `compare_pet_breeds` | `GET /pets/compare?catBreedId=&dogBreedId=` |
| `get_pet_showdown` | `GET /pets/showdown` |
| `get_pet_stats` | `GET /pets/stats` |
| `get_pet_of_the_day` | `GET /pets/of-the-day` |

### Resources
- `paws-api://openapi.json` — paws-api's OpenAPI document, fetched live on read.
