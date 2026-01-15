# Tasks: PocketBase MCP Server

**Input**: Design documents from `/specs/001-pocketbase-mcp-server/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure with src/, tests/ directories per plan.md
- [x] T002 Initialize Node.js project with package.json (name: pocketbase-mcp-server, type: module)
- [x] T003 [P] Configure TypeScript with tsconfig.json (strict mode, ES2022, Node16 module)
- [x] T004 [P] Configure ESLint with TypeScript rules in eslint.config.js
- [x] T005 [P] Add .gitignore for node_modules/, dist/, .env
- [x] T006 Install production dependencies: @modelcontextprotocol/sdk, pocketbase, @iarna/toml, zod
- [x] T007 Install dev dependencies: typescript, vitest, tsx, @types/node, eslint

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create constants in src/constants.ts (DEFAULT_LIMIT=50, MAX_LIMIT=500, MAX_RESPONSE_SIZE=25000)
- [x] T009 [P] Create TypeScript interfaces in src/types.ts per data-model.md (ServerConfig, AuthState, RecordListParams, etc.)
- [x] T010 [P] Implement TOML formatter in src/formatters/toml.ts (formatToToml function using @iarna/toml)
- [x] T011 [P] Implement JSON formatter in src/formatters/json.ts (formatToJson function)
- [x] T012 Create formatter index in src/formatters/index.ts (format function with format param routing)
- [x] T013 Create PocketBase service wrapper in src/services/pocketbase.ts (singleton client, getClient function)
- [x] T014 Implement error handler in src/services/pocketbase.ts (handlePocketBaseError with error codes)
- [x] T015 Create MCP server entry point in src/index.ts (McpServer init, stdio transport setup)
- [x] T016 Add npm scripts to package.json: build, dev, start

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Query Collection Records (Priority: P1) 🎯 MVP

**Goal**: AI agents can retrieve data from PocketBase collections with filtering, sorting, pagination

**Independent Test**: Query any collection, verify records return in TOML format with pagination info

### Implementation for User Story 1

- [x] T017 [P] [US1] Create record schemas in src/schemas/records.ts (ListRecordsInput, GetRecordInput with Zod)
- [x] T018 [US1] Implement pocketbase_list_records tool in src/tools/records.ts (filter, sort, page, perPage, expand, fields, format)
- [x] T019 [US1] Implement pocketbase_get_record tool in src/tools/records.ts (collection, id, expand, fields, format)
- [x] T020 [US1] Register record query tools in src/index.ts (import and registerTool calls)
- [x] T021 [US1] Add pagination metadata to list responses (hasMore, nextOffset, totalItems, totalPages)

**Checkpoint**: User Story 1 complete - can query any collection with full filtering support

---

## Phase 4: User Story 2 - Authenticate with PocketBase (Priority: P1)

**Goal**: AI agents can authenticate as admin or user to access protected resources

**Independent Test**: Login as admin, verify auth status shows authenticated, logout and verify cleared

### Implementation for User Story 2

- [x] T022 [P] [US2] Create auth schemas in src/schemas/auth.ts (AuthAdminInput, AuthUserInput, GetAuthStatusInput, LogoutInput)
- [x] T023 [US2] Implement pocketbase_auth_admin tool in src/tools/auth.ts (email, password → admin auth via SDK)
- [x] T024 [US2] Implement pocketbase_auth_user tool in src/tools/auth.ts (collection, email, password → user auth)
- [x] T025 [US2] Implement pocketbase_get_auth_status tool in src/tools/auth.ts (return current AuthState)
- [x] T026 [US2] Implement pocketbase_logout tool in src/tools/auth.ts (clear authStore)
- [x] T027 [US2] Register auth tools in src/index.ts

**Checkpoint**: User Stories 1 & 2 complete - full read access with authentication

---

## Phase 5: User Story 3 - Create and Update Records (Priority: P2)

**Goal**: AI agents can create new records and update existing records

**Independent Test**: Create record, verify returned with ID; update record, verify changes persist

### Implementation for User Story 3

- [x] T028 [P] [US3] Add CreateRecordInput, UpdateRecordInput schemas to src/schemas/records.ts
- [x] T029 [US3] Implement pocketbase_create_record tool in src/tools/records.ts (collection, data → pb.collection().create())
- [x] T030 [US3] Implement pocketbase_update_record tool in src/tools/records.ts (collection, id, data → pb.collection().update())
- [x] T031 [US3] Add validation error handling for create/update (field-specific errors in TOML format)
- [x] T032 [US3] Register create/update tools in src/index.ts

**Checkpoint**: User Stories 1-3 complete - full read/write for records

---

## Phase 6: User Story 4 - Delete Records (Priority: P2)

**Goal**: AI agents can delete records from collections

**Independent Test**: Delete existing record, verify not found on subsequent get

### Implementation for User Story 4

- [x] T033 [P] [US4] Add DeleteRecordInput schema to src/schemas/records.ts
- [x] T034 [US4] Implement pocketbase_delete_record tool in src/tools/records.ts (collection, id → pb.collection().delete())
- [x] T035 [US4] Register delete tool in src/index.ts

**Checkpoint**: User Stories 1-4 complete - full CRUD for records

---

## Phase 7: User Story 5 - List and Inspect Collections (Priority: P2)

**Goal**: AI agents can discover collections and their schemas (admin only)

**Independent Test**: List collections as admin, get schema for specific collection

### Implementation for User Story 5

- [x] T036 [P] [US5] Create collection schemas in src/schemas/collections.ts (ListCollectionsInput, GetCollectionInput)
- [x] T037 [US5] Add admin auth check helper in src/services/pocketbase.ts (requireAdminAuth function)
- [x] T038 [US5] Implement pocketbase_list_collections tool in src/tools/collections.ts (page, perPage, filter → admin API)
- [x] T039 [US5] Implement pocketbase_get_collection tool in src/tools/collections.ts (name → full schema with fields, rules)
- [x] T040 [US5] Register collection read tools in src/index.ts

**Checkpoint**: User Stories 1-5 complete - record CRUD + collection discovery

---

## Phase 8: User Story 6 - Manage Collections (Priority: P3)

**Goal**: Admin can create, update, and delete collections programmatically

**Independent Test**: Create collection with schema, add record to it, delete collection

### Implementation for User Story 6

- [x] T041 [P] [US6] Add CreateCollectionInput, UpdateCollectionInput, DeleteCollectionInput to src/schemas/collections.ts
- [x] T042 [US6] Implement pocketbase_create_collection tool in src/tools/collections.ts (name, type, fields, rules)
- [x] T043 [US6] Implement pocketbase_update_collection tool in src/tools/collections.ts (name, fields, rules updates)
- [x] T044 [US6] Implement pocketbase_delete_collection tool in src/tools/collections.ts (name → delete with confirmation)
- [x] T045 [US6] Register collection management tools in src/index.ts

**Checkpoint**: User Stories 1-6 complete - full CRUD for records and collections

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, testing, and final improvements

- [x] T051 [P] Create README.md with installation, configuration, and usage examples
- [x] T052 [P] Create .env.example with POCKETBASE_URL template
- [x] T053 [P] Add unit tests for formatters in tests/unit/formatters.test.ts
- [x] T054 [P] Add unit tests for PocketBase service in tests/unit/services.test.ts
- [x] T055 Verify all tools build without errors (npm run build)
- [x] T056 Test with MCP Inspector: npx @modelcontextprotocol/inspector
- [x] T057 Run quickstart.md validation (manual test against real PocketBase)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phases 3-9 (User Stories)**: All depend on Phase 2 completion
- **Phase 10 (Polish)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Can Start After | Notes |
|-------|-----------------|-------|
| US1 (Query) | Phase 2 | MVP - no other story dependencies |
| US2 (Auth) | Phase 2 | Independent, but unlocks protected operations |
| US3 (Create/Update) | Phase 2 | Benefits from US2 for protected collections |
| US4 (Delete) | Phase 2 | Benefits from US2 for protected collections |
| US5 (List Collections) | Phase 2 | Requires US2 admin auth |
| US6 (Manage Collections) | Phase 2 | Requires US2 admin auth |

### Parallel Opportunities

**Within Phase 1 (Setup):**
```
T003, T004, T005 can run in parallel (different config files)
```

**Within Phase 2 (Foundational):**
```
T009, T010, T011 can run in parallel (different files)
```

**User Stories after Phase 2:**
```
US1, US2 can run in parallel (P1 priority, independent)
US3, US4, US5 can run in parallel (P2 priority, independent)
US6, US7 can run in parallel (P3 priority, independent)
```

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1: Setup (~15 min)
2. Complete Phase 2: Foundational (~1 hour)
3. Complete Phase 3: User Story 1 - Query (~30 min)
4. **STOP and VALIDATE**: Test queries work with real PocketBase
5. Complete Phase 4: User Story 2 - Auth (~30 min)
6. **MVP READY**: Can query and authenticate

### Full Implementation

Continue with US3-US7 in priority order, validating at each checkpoint.

---

## Summary

| Phase | Tasks | Parallel | Estimated Time |
|-------|-------|----------|----------------|
| Setup | T001-T007 | 3 | 15 min |
| Foundational | T008-T016 | 3 | 1 hour |
| US1 Query | T017-T021 | 1 | 30 min |
| US2 Auth | T022-T027 | 1 | 30 min |
| US3 Create/Update | T028-T032 | 1 | 30 min |
| US4 Delete | T033-T035 | 1 | 15 min |
| US5 List Collections | T036-T040 | 1 | 30 min |
| US6 Manage Collections | T041-T045 | 1 | 30 min |
| US7 Realtime | T046-T050 | 1 | 45 min |
| Polish | T051-T057 | 4 | 1 hour |
| **Total** | **57 tasks** | | **~6 hours** |
