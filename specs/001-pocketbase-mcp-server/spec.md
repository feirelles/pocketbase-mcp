# Feature Specification: PocketBase MCP Server

**Feature Branch**: `001-pocketbase-mcp-server`  
**Created**: 2026-01-15  
**Status**: Draft  
**Input**: User description: "Create an MCP server for PocketBase access providing both query and administration capabilities using Node.js and the PocketBase JavaScript SDK"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Query Collection Records (Priority: P1)

An AI agent needs to retrieve data from a PocketBase collection to answer user questions or provide information. The agent connects to a PocketBase instance and queries records with filtering, sorting, and pagination support.

**Why this priority**: Querying data is the most fundamental operation - without it, the MCP server provides no value. Most AI agent interactions with databases are read-heavy.

**Independent Test**: Can be fully tested by connecting to a PocketBase instance and retrieving records from any existing collection. Delivers immediate value by enabling AI agents to access and present data.

**Acceptance Scenarios**:

1. **Given** a PocketBase instance with a "posts" collection containing records, **When** the agent requests all posts, **Then** a list of post records is returned with pagination information
2. **Given** a PocketBase instance with records, **When** the agent requests posts filtered by `status = "published"`, **Then** only published posts are returned
3. **Given** a large collection, **When** the agent requests records with pagination (page 2, 10 per page), **Then** the correct subset of records is returned
4. **Given** a collection with relations, **When** the agent requests posts with `expand: "author"`, **Then** posts are returned with expanded author data

---

### User Story 2 - Authenticate with PocketBase (Priority: P1)

An AI agent needs to authenticate with a PocketBase instance to access protected resources or perform administrative operations. The agent can authenticate as a superuser/admin or as a regular user.

**Why this priority**: Authentication is required for any meaningful interaction with PocketBase beyond public data access. Admin operations are completely blocked without proper authentication.

**Independent Test**: Can be fully tested by authenticating with valid credentials and verifying the auth token is stored and used in subsequent requests.

**Acceptance Scenarios**:

1. **Given** valid admin credentials, **When** the agent authenticates as admin, **Then** an auth token is obtained and stored for subsequent requests
2. **Given** valid user credentials, **When** the agent authenticates as a regular user, **Then** an auth token is obtained with user-level permissions
3. **Given** invalid credentials, **When** the agent attempts to authenticate, **Then** a clear error message is returned explaining the failure
4. **Given** an existing auth session, **When** the agent checks auth status, **Then** current authentication state and user info are returned

---

### User Story 3 - Create and Update Records (Priority: P2)

An AI agent needs to create new records or update existing records in PocketBase collections. This enables the agent to persist new data or modify existing data based on user interactions.

**Why this priority**: Write operations are essential for productive AI agents that need to take actions, but they depend on authentication being in place first.

**Independent Test**: Can be tested by creating a new record in a test collection and verifying it appears in subsequent queries. Update can be tested by modifying a record and confirming changes persist.

**Acceptance Scenarios**:

1. **Given** authentication and a collection, **When** the agent creates a record with valid data, **Then** the record is created and the new record with ID is returned
2. **Given** an existing record, **When** the agent updates specific fields, **Then** only those fields are modified and the updated record is returned
3. **Given** invalid data (missing required fields), **When** the agent attempts to create a record, **Then** a validation error is returned with field-specific details
4. **Given** a collection with file fields, **When** the agent creates a record with file data, **Then** the file is uploaded and associated with the record

---

### User Story 4 - Delete Records (Priority: P2)

An AI agent needs to delete records from PocketBase collections when instructed by users or as part of data management workflows.

**Why this priority**: Delete operations complete the basic CRUD capability, but are less frequently used than create/read/update.

**Independent Test**: Can be tested by deleting a test record and verifying it no longer appears in queries.

**Acceptance Scenarios**:

1. **Given** an existing record and proper permissions, **When** the agent deletes the record, **Then** the record is removed and a success confirmation is returned
2. **Given** a non-existent record ID, **When** the agent attempts to delete, **Then** a clear error message indicates the record was not found
3. **Given** insufficient permissions, **When** the agent attempts to delete, **Then** an authorization error is returned

---

### User Story 5 - List and Inspect Collections (Priority: P2)

An AI agent needs to discover what collections exist in a PocketBase instance and understand their schema (fields, types, rules). This enables the agent to dynamically adapt to different PocketBase configurations.

**Why this priority**: Schema discovery is essential for AI agents to work with unknown PocketBase instances, but requires admin authentication.

**Independent Test**: Can be tested by listing all collections and retrieving detailed schema information for a specific collection.

**Acceptance Scenarios**:

1. **Given** admin authentication, **When** the agent lists all collections, **Then** a list of collection names and types is returned
2. **Given** a collection name, **When** the agent requests collection details, **Then** full schema including fields, types, and rules is returned
3. **Given** no admin authentication, **When** the agent attempts to list collections, **Then** an appropriate error indicates admin access is required

---

### User Story 6 - Manage Collections (Admin) (Priority: P3)

An administrator needs the AI agent to create, update, or delete collections programmatically. This enables schema management and database setup through the MCP interface.

**Why this priority**: Collection management is an administrative task that happens less frequently than data operations, primarily useful during setup or schema evolution.

**Independent Test**: Can be tested by creating a new collection with a defined schema and verifying it exists and accepts records.

**Acceptance Scenarios**:

1. **Given** admin authentication, **When** the agent creates a collection with a schema definition, **Then** the collection is created and ready for use
2. **Given** an existing collection, **When** the agent updates the collection schema (add/modify fields), **Then** the schema is updated while preserving existing data
3. **Given** an existing collection, **When** the agent deletes the collection, **Then** the collection and all its records are removed
4. **Given** invalid schema (e.g., reserved name), **When** the agent attempts to create a collection, **Then** a validation error explains the issue

---

### Edge Cases

- What happens when the PocketBase server is unreachable? → Return connection error with server URL for troubleshooting
- What happens when auth token expires during a session? → Detect 401 responses and prompt for re-authentication
- What happens when querying a non-existent collection? → Return clear error identifying the collection name
- What happens with very large result sets? → Enforce pagination limits and return pagination metadata
- What happens when file uploads exceed size limits? → Return error with size limit information
- What happens when attempting admin operations without admin auth? → Return authorization error with required permission level

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect to a PocketBase instance using a configurable base URL
- **FR-002**: System MUST authenticate as admin/superuser using email and password credentials
- **FR-003**: System MUST authenticate as regular user using email and password credentials
- **FR-004**: System MUST list records from any collection with support for filtering, sorting, and pagination
- **FR-005**: System MUST retrieve a single record by ID with optional relation expansion
- **FR-006**: System MUST create new records in any collection with provided data
- **FR-007**: System MUST update existing records by ID with partial data (patch semantics)
- **FR-008**: System MUST delete records by ID
- **FR-009**: System MUST list all collections (admin only)
- **FR-010**: System MUST retrieve collection schema details including fields, types, and rules (admin only)
- **FR-011**: System MUST create new collections with schema definition (admin only)
- **FR-012**: System MUST update collection schemas (admin only)
- **FR-013**: System MUST delete collections (admin only)
- **FR-014**: System MUST support file uploads when creating or updating records with file fields
- **FR-015**: System MUST return meaningful error messages with actionable information
- **FR-016**: System MUST expose the current authentication status (logged in, user type, user info)
- **FR-017**: System MUST support relation expansion in queries using the `expand` parameter
- **FR-018**: System MUST be installable via npm with `pocketbase` as a peer/direct dependency
- **FR-019**: System MUST return query results in TOML format by default to minimize token usage for AI agents
- **FR-020**: System MUST support optional JSON output format when explicitly requested

### Key Entities

- **PocketBase Instance**: A running PocketBase server with a base URL (e.g., `http://localhost:8090`)
- **Collection**: A data container in PocketBase with a name, type (base, auth, view), and schema (fields with types and rules)
- **Record**: An individual data entry in a collection with an ID, timestamps, and field values
- **Auth Session**: The current authentication state including token, user type (admin/user), and user information
- **Tool**: An MCP tool exposed by the server that AI agents can invoke to perform operations

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI agents can retrieve records from any PocketBase collection in under 2 seconds for typical queries (< 1000 records)
- **SC-002**: All CRUD operations (create, read, update, delete) complete successfully with proper error handling for invalid inputs
- **SC-003**: Admin operations (collection management) are properly gated requiring admin authentication
- **SC-004**: Error messages provide sufficient context for users to understand and resolve issues without external documentation
- **SC-005**: The MCP server can be installed and configured in under 5 minutes by a developer familiar with Node.js
- **SC-006**: 100% of PocketBase JavaScript SDK record and collection operations are accessible through MCP tools

## Assumptions

- PocketBase instance is already running and accessible at a known URL
- Users have valid credentials (admin or user) for the PocketBase instance they want to access
- Node.js (version 18+) is available in the environment where the MCP server runs
- The MCP server will run as a local process using stdio transport (not HTTP)
- File uploads are handled by passing file data encoded appropriately (base64 or file paths)
- The PocketBase JavaScript SDK handles connection management and token refresh internally
