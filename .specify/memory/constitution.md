<!--
Sync Impact Report - Constitution v1.0.0
========================================
Version: Initial creation (v1.0.0)
Date: 2026-01-15

Changes:
- Initial constitution created for PocketBase MCP Server project
- Established 6 core principles: MCP Protocol Compliance, Tool Quality & Design,
  TypeScript-First Development, Security & Access Control, Comprehensive API Coverage,
  and Test-First Development
- Technology Stack: TypeScript, MCP SDK, Streamable HTTP transport
- Quality Standards: Tool design patterns, error handling, testing requirements
- Governance: Amendment process and compliance verification

Templates Status:
✅ .specify/templates/plan-template.md - Aligned with constitution principles
✅ .specify/templates/spec-template.md - Compatible with feature workflow
✅ .specify/templates/tasks-template.md - Test-first workflow enforced
⚠ Command templates - To be verified during first execution

Follow-up Actions:
- Verify consistency across all command templates in .specify/templates/commands/
- Ensure all new features validate against MCP best practices
- Update skills documentation if MCP protocol updates occur
-->

# PocketBase MCP Server Constitution

## Core Principles

### I. MCP Protocol Compliance

Every tool MUST adhere to the Model Context Protocol specification. Tools are the primary interaction mechanism between LLMs and PocketBase services.

**Non-negotiable requirements:**
- All tools MUST follow MCP transport protocol (Streamable HTTP for remote, stdio for local)
- Tool schemas MUST use Zod for TypeScript validation with comprehensive type definitions
- Tool responses MUST return actionable JSON or formatted Markdown
- Error messages MUST be specific, actionable, and guide agents toward resolution
- All endpoints MUST support stateless operation (no session dependencies)

**Rationale**: MCP protocol compliance ensures interoperability with all MCP clients and provides a consistent, predictable interface for LLM agents. Stateless design enables horizontal scaling and simplifies deployment.

### II. Tool Quality & Design

Tool design prioritizes discoverability, clarity, and agent productivity over raw API coverage.

**Non-negotiable requirements:**
- Tool names MUST follow consistent naming: `pocketbase_<action>_<resource>` (e.g., `pocketbase_create_record`, `pocketbase_list_collections`)
- Tool descriptions MUST be concise (1-2 sentences), action-oriented, and include key parameters
- Input schemas MUST have clear constraints, defaults, and validation rules
- Responses MUST be filtered and focused (pagination required for list operations)
- Each tool MUST serve a clear, single purpose (avoid multi-function tools)
- High-level workflow tools MAY be provided for common patterns, but MUST NOT replace comprehensive API coverage

**Rationale**: Clear, consistent tool naming and focused functionality help LLM agents quickly discover the right tools. Concise descriptions reduce token usage and improve decision-making. This follows MCP best practices for tool design.

### III. TypeScript-First Development

TypeScript is the primary implementation language with strict type safety.

**Non-negotiable requirements:**
- All code MUST use TypeScript with strict mode enabled (`strict: true` in tsconfig.json)
- Type definitions MUST be explicit (no `any` types except in justified edge cases)
- Zod schemas MUST define all input validation with proper constraints
- Project MUST use ESLint with recommended TypeScript rules
- Build target MUST be ES2022 or later for modern JavaScript features

**Rationale**: TypeScript provides static typing that catches errors early, improves code maintainability, and generates excellent IDE support. The MCP TypeScript SDK is well-maintained and widely compatible. AI models excel at generating TypeScript code due to its popularity and explicit typing.

### IV. Security & Access Control

Security and access control MUST be enforced at every layer.

**Non-negotiable requirements:**
- Authentication credentials (URL, admin token) MUST be configurable via environment variables
- Credentials MUST NEVER be hardcoded or committed to version control
- All PocketBase API calls MUST validate responses and handle authentication errors gracefully
- Admin operations MUST require explicit authentication (fail closed, not open)
- File operations MUST validate file types, sizes, and permissions
- Collection rules and security policies MUST be respected and documented
- Rate limiting MUST be implemented for production deployments

**Rationale**: PocketBase handles sensitive user data, authentication, and file storage. Security failures can lead to data breaches, unauthorized access, and compliance violations. Defense in depth ensures security even if one layer fails.

### V. Comprehensive API Coverage

Prioritize comprehensive PocketBase API coverage while providing workflow convenience tools.

**Non-negotiable requirements:**
- MUST implement tools for all core PocketBase operations:
  - Records: Create, read, update, delete, list with filters
  - Collections: List, get schema, manage collections (admin)
  - Authentication: Auth methods, user management
  - Files: Upload, download, manage file fields
  - Settings: Get/update app settings (admin)
  - Realtime: Subscribe to record changes (if applicable)
- Workflow tools MAY be added for common patterns (e.g., "create user with profile") but MUST NOT replace granular API tools
- Each PocketBase API endpoint MUST map to at least one MCP tool
- Pagination MUST be supported for all list operations (default 50, max 500 items per page)
- Filtering, sorting, and expansion MUST be supported via PocketBase query syntax

**Rationale**: Comprehensive API coverage gives LLM agents maximum flexibility to compose operations. Some MCP clients support code execution that can combine basic tools effectively. When uncertain, favor API completeness over convenience.

### VI. Test-First Development

Testing MUST follow the Test-Driven Development (TDD) cycle for all features.

**Non-negotiable requirements:**
- Tests MUST be written BEFORE implementation (Red-Green-Refactor)
- Every tool MUST have contract tests validating input/output schemas
- Integration tests MUST verify end-to-end workflows with actual PocketBase instances
- Tests MUST fail initially, then pass after implementation
- Unit tests MUST cover error conditions and edge cases
- Test coverage MUST be measured and tracked (target: >80% for critical paths)
- Tests MUST be automated and run on every commit (CI/CD pipeline)

**Rationale**: TDD ensures that all features are testable, well-designed, and meet specifications before implementation begins. Contract tests verify MCP protocol compliance. Integration tests catch real-world issues with PocketBase APIs.

## Technology Stack

### Required Technologies

**Language & Runtime:**
- TypeScript 5.x with strict mode
- Node.js 18.x or later (LTS versions)

**MCP Implementation:**
- MCP TypeScript SDK (latest stable version)
- Streamable HTTP transport for remote servers
- Zod for schema validation

**PocketBase Integration:**
- PocketBase JavaScript SDK for API communication
- Support for PocketBase 0.20.x and later

**Testing Framework:**
- Jest or Vitest for unit and integration tests
- Supertest for API endpoint testing (if exposing HTTP endpoints)

**Development Tools:**
- ESLint with TypeScript plugins
- Prettier for code formatting
- tsx or ts-node for development execution

### Dependency Management

- Package manager: npm or pnpm (specify in project documentation)
- Lock file MUST be committed (`package-lock.json` or `pnpm-lock.yaml`)
- Dependencies MUST be regularly updated and security-audited
- Peer dependencies MUST be clearly documented

## Quality Standards

### Tool Design Checklist

Every tool implementation MUST satisfy:

1. **Schema Validation**: Input validated with Zod, all constraints defined
2. **Error Handling**: Specific error messages with actionable guidance
3. **Response Format**: Consistent JSON structure or Markdown formatting
4. **Documentation**: Tool description, parameters, and examples in README
5. **Testing**: Contract test + integration test + error case tests
6. **Performance**: Pagination for lists, efficient queries, no N+1 problems

### Code Quality Gates

Before any feature is considered complete:

- ✅ All tests pass (unit + integration + contract)
- ✅ ESLint shows no errors or warnings
- ✅ TypeScript compilation succeeds with no errors
- ✅ Code formatted with Prettier
- ✅ Test coverage meets or exceeds 80% for new code
- ✅ Documentation updated (README, API docs, examples)
- ✅ Security review passed (credentials not exposed, validation complete)

### Performance Requirements

- Tool response time: <500ms p95 for read operations
- Tool response time: <2s p95 for write operations
- List operations MUST paginate (default 50 items, max 500)
- File uploads MUST stream large files (>1MB) to avoid memory issues
- Connection pooling MUST be implemented for multiple concurrent requests

## Governance

### Amendment Process

1. Propose amendment with clear rationale and impact analysis
2. Document how amendment affects existing features and patterns
3. Update constitution version following semantic versioning:
   - **MAJOR**: Breaking changes to principles, incompatible with previous version
   - **MINOR**: New principles added, enhanced guidance (backward compatible)
   - **PATCH**: Clarifications, typo fixes, non-semantic improvements
4. Update all affected templates and documentation
5. Create migration plan if existing code must be updated
6. Obtain approval from project maintainer(s)

### Compliance Verification

- All feature specifications MUST include "Constitution Check" section
- All PRs MUST be reviewed for principle compliance
- Complexity violations MUST be explicitly justified in plan.md
- Constitution supersedes all other practices and preferences

### Living Document

This constitution should be updated as:
- MCP protocol evolves (protocol updates, new capabilities)
- PocketBase introduces breaking API changes
- Team discovers new patterns or anti-patterns
- Production experience reveals unforeseen issues

**Version**: 1.0.0 | **Ratified**: 2026-01-15 | **Last Amended**: 2026-01-15
