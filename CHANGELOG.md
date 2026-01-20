# Changelog

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
