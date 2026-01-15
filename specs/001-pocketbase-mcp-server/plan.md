# Implementation Plan: PocketBase MCP Server

**Branch**: `001-pocketbase-mcp-server` | **Date**: 2026-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-pocketbase-mcp-server/spec.md`

## Summary

Build an MCP server that enables AI agents to interact with PocketBase instances for both data queries and administration. Uses Node.js/TypeScript with the PocketBase JavaScript SDK, communicating via stdio transport. Returns results in TOML format by default to minimize token usage.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+  
**Primary Dependencies**: @modelcontextprotocol/sdk, pocketbase, zod, @iarna/toml  
**Storage**: N/A (PocketBase is external)  
**Testing**: Vitest for unit/integration tests  
**Target Platform**: Local stdio MCP server (all platforms with Node.js)
**Project Type**: Single NPM package  
**Performance Goals**: <500ms p95 for read operations, <2s p95 for writes  
**Constraints**: Pagination default 50 items, max 500 per request  
**Scale/Scope**: Single MCP server package, ~15 tools

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. MCP Protocol Compliance | ✅ PASS | stdio transport, Zod schemas, stateless design |
| II. Tool Quality & Design | ✅ PASS | `pocketbase_<action>_<resource>` naming, focused tools |
| III. TypeScript-First | ✅ PASS | Strict TypeScript, Zod validation, ESLint |
| IV. Security & Access Control | ✅ PASS | Env vars for credentials, auth validation |
| V. Comprehensive API Coverage | ✅ PASS | All PocketBase operations mapped to tools |
| VI. Test-First Development | ✅ PASS | Contract tests + integration tests planned |

## Project Structure

### Documentation (this feature)

```text
specs/001-pocketbase-mcp-server/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (tool schemas)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── index.ts             # Entry point, MCP server initialization
├── types.ts             # TypeScript interfaces and types
├── constants.ts         # Shared constants (limits, defaults)
├── formatters/
│   ├── toml.ts          # TOML output formatter
│   └── json.ts          # JSON output formatter
├── services/
│   └── pocketbase.ts    # PocketBase SDK wrapper with auth management
├── schemas/
│   ├── auth.ts          # Authentication input schemas
│   ├── records.ts       # Record CRUD schemas
│   └── collections.ts   # Collection management schemas
└── tools/
    ├── auth.ts          # pocketbase_auth_*, pocketbase_get_auth_status
    ├── records.ts       # pocketbase_list_records, pocketbase_*_record
    └── collections.ts   # pocketbase_list_collections, pocketbase_*_collection

tests/
├── contract/            # Schema validation tests
│   ├── auth.test.ts
│   ├── records.test.ts
│   └── collections.test.ts
├── integration/         # End-to-end with real PocketBase
│   └── workflows.test.ts
└── unit/
    ├── formatters.test.ts
    └── services.test.ts
```

**Structure Decision**: Single project structure - this is a standalone MCP server package published to npm. No frontend/backend split needed.

## Tool Inventory

| Tool Name | Category | Priority | FR Mapping |
|-----------|----------|----------|------------|
| `pocketbase_auth_admin` | Auth | P1 | FR-002 |
| `pocketbase_auth_user` | Auth | P1 | FR-003 |
| `pocketbase_get_auth_status` | Auth | P1 | FR-016 |
| `pocketbase_list_records` | Records | P1 | FR-004, FR-017 |
| `pocketbase_get_record` | Records | P1 | FR-005, FR-017 |
| `pocketbase_create_record` | Records | P2 | FR-006, FR-014 |
| `pocketbase_update_record` | Records | P2 | FR-007, FR-014 |
| `pocketbase_delete_record` | Records | P2 | FR-008 |
| `pocketbase_list_collections` | Collections | P2 | FR-009 |
| `pocketbase_get_collection` | Collections | P2 | FR-010 |
| `pocketbase_create_collection` | Collections | P3 | FR-011 |
| `pocketbase_update_collection` | Collections | P3 | FR-012 |
| `pocketbase_delete_collection` | Collections | P3 | FR-013 |

## Complexity Tracking

> No violations - project follows constitution guidelines.
