# paws

All paws, no bite: TheCatAPI and TheDogAPI in one friendly API, with an MCP server and web app.

| Folder | What it is |
| --- | --- |
| [`api/`](api) | Express + TypeScript service that aggregates TheCatAPI and TheDogAPI |
| [`mcp-server/`](mcp-server) | MCP server exposing the API's endpoints as tools for Claude and other MCP clients |
| [`web/`](web) | React + Vite frontend (scaffold, not yet wired to the API) |

```
MCP client  -->  mcp-server  -->  api  -->  TheCatAPI / TheDogAPI
```

See each folder's README for setup.
