# pocketbase-mcp

MCP server (`@feirelles/pocketbase-mcp`, published on npm) that lets AI agents query and
administer one or more PocketBase instances. TypeScript, stdio transport, Zod schemas,
TOML output by default. Global rules apply (`~/.claude/CLAUDE.md`); only the specifics below.

## Layout
- `src/index.ts` — server entry; registers every tool.
- `src/tools/` — tool handlers (connections, auth, records, collections, admin, files).
- `src/schemas/` — Zod input schemas, one file per tool group (`common.ts` shared fragments).
- `src/services/pocketbase.ts` — connection registry (`resolveInstance`, `resetRegistry`) and error mapping.
- `src/formatters/` — TOML/JSON output.
- `tests/unit`, `tests/contract` — run by vitest; `tests/integration/` — excluded, needs a live PocketBase.
- `pocketbase/` — local PocketBase binary + `pb_data/` (gitignored) for integration runs.
- `examples/` — sample collection payloads; `CHANGELOG.md` — keep-a-changelog style, bump with `package.json`.

## Commands
```bash
npm install
npm run build          # tsc → dist/ (gitignored, but the MCP registration points at it)
npm test               # vitest, unit + contract (no PocketBase needed)
npm run lint
npm run dev            # tsx watch src/index.ts
./pocketbase/pocketbase serve                      # local instance on :8090
npx tsx tests/integration/pocketbase.test.ts       # against the running instance
```

## MCP registration on this VM
- Registered at **user scope** as `pocketbase` in `~/.claude.json`:
  `node /home/felipe/workspaces/pocketbase-mcp/dist/index.js`. Every project on the VM uses this build.
- After changing `src/`, run `npm run build`; sessions pick up the new `dist/` on their next MCP start.
  A broken `dist/` breaks the `pocketbase` MCP for every workspace, so run `npm test` before building.
- Usage guide for agents (connect-first flow, `instance` param, filters, rules): global skill
  `~/.claude/skills/pocketbase/`. Keep it in sync when tools or parameters change.

## Gotchas
- The server reads no env vars; instances are registered at runtime via `pocketbase_connect`.
- `pocketbase/pb_data/` is runtime data (SQLite + generated `types.d.ts`); never commit it.
- Release: bump `package.json` + `package-lock.json` + `CHANGELOG.md`, tag, `npm publish`.
- PR base: `main`.
