# Changelog

## [1.3.0] - 2026-01-20

### Added
- **New Tool**: `pocketbase_get_file_url` - Generate URLs to access files with optional thumbnail support
  - Thumbnail formats: WxH (crop center), WxHt (crop top), WxHb (crop bottom), WxHf (fit), 0xH (height), Wx0 (width)
  - Download parameter for forcing file download
- **New Parameters**:
  - `skipTotal` on `list_records` for better performance with large datasets
  - `expand` and `fields` on `create_record` and `update_record` for expanded responses
  - `identityField` on `auth_user` to specify which field to use for authentication
- **Contract Tests**: Added comprehensive schema validation tests (100 tests total)
- **Skill Documentation**: Added `.github/skills/pocketbase-mcp/SKILL.md` for AI agent guidance

### Changed
- **BREAKING**: `auth_user` now uses `identity` parameter instead of `email` (supports both email and username)
- `create_backup` now has optional `name` parameter (auto-generates if not provided)
- Refactored tool registration to avoid circular imports (tools now receive server as parameter)

### Fixed
- Fixed circular import issue between index.ts and tool modules
- Improved TypeScript types for McpServer parameter

## [1.2.0] - 2026-01-20

### Added
- **New Tools**:
  - `pocketbase_health_check`: Check PocketBase server health status
  - `pocketbase_list_logs`: List server logs with filtering and pagination
  - `pocketbase_get_log`: Get a single log entry by ID
  - `pocketbase_log_stats`: Get hourly log statistics
  - `pocketbase_list_backups`: List all available backup files
  - `pocketbase_create_backup`: Create a new database backup
  - `pocketbase_restore_backup`: Restore from a backup file
  - `pocketbase_delete_backup`: Delete a backup file

### Fixed
- **Deprecated API usage**: Replaced `pb.authStore.isAdmin` with `pb.authStore.isSuperuser`
- **Auth state**: Now correctly uses `pb.authStore.record` instead of deprecated `pb.authStore.model`

### Changed
- Authentication now correctly checks `isSuperuser` property (PocketBase v0.22+ compatible)
- Improved auth state reporting with `collectionName` in model info

## [1.1.0] - 2026-01-20

### Changed
- **BREAKING**: Updated PocketBase SDK from 0.21.5 to 0.26.6
- **Fixed**: Collection fields now correctly returned (using `fields` instead of deprecated `schema`)
- **Improved**: `get_collection` now returns all field properties including `id`, `hidden`, `presentable`, `system`, and type-specific properties
- **Improved**: Full support for all PocketBase field types (text, number, bool, email, url, date, select, relation, file, json, editor, autodate, geoPoint)

### Fixed
- Collections now correctly show all fields with proper structure
- Field count is now accurate in `list_collections` and `get_collection`

## [1.0.3] - 2026-01-20

### Improved
- **get_collection tool**: Enhanced field information display with more detailed options and top-level properties for select and relation fields
- Added `fieldCount` to collection output for quick reference
- Better extraction of field-specific properties (values, maxSelect, collectionId, cascadeDelete, etc.)

## [1.0.2] - 2026-01-20

### Fixed
- **Relation fields**: Automatically resolve collection names to IDs when creating or updating collections
- **Relation fields**: Properly extract `collectionId`, `cascadeDelete`, `maxSelect`, `displayFields` to field level (PocketBase API requirement)
- **File fields**: Properly extract `maxSelect`, `maxSize`, `mimeTypes`, `thumbs` to field level (PocketBase API requirement)

### Added
- New example: `create-collection-with-relations.json` demonstrating relation field usage
- Documentation for relation field handling in README
- Documentation for file field handling in README

## [1.0.1] - 2026-01-16

### Fixed
- Autodate fields now correctly extract `onCreate` and `onUpdate` properties to field level (PocketBase API requirement)

## [1.0.0] - 2026-01-16

Initial release with support for PocketBase CRUD operations, authentication, and collection management through MCP.
