# PocketBase CLI Commands

## Overview

The PocketBase Command Line Interface (CLI) provides powerful tools for managing your PocketBase instances, including server operations, database migrations, user management, and system administration. The CLI is essential for development workflows, production deployments, and automation tasks.

## Installation & Setup

The PocketBase CLI is built into the main PocketBase executable. After downloading PocketBase, the CLI is available via the `./pocketbase` command.

```bash
# Make sure the executable has proper permissions
chmod +x pocketbase

# Verify CLI is working
./pocketbase --help
```

## Global Flags

These flags can be used with any PocketBase CLI command:

| Flag | Description | Default |
|------|-------------|---------|
| `--automigrate` | Enable/disable auto migrations | `true` |
| `--dev` | Enable dev mode (prints logs and SQL statements to console) | `false` |
| `--dir string` | The PocketBase data directory | `"pb_data"` |
| `--encryptionEnv string` | Env variable with 32-char value for app settings encryption | `none` |
| `--hooksDir string` | Directory with JS app hooks | |
| `--hooksPool int` | Total prewarm goja.Runtime instances for JS hooks execution | `15` |
| `--hooksWatch` | Auto restart on pb_hooks file change (no effect on Windows) | `true` |
| `--indexFallback` | Fallback to index.html on missing static path (for SPA pretty URLs) | `true` |
| `--migrationsDir string` | Directory with user-defined migrations | |
| `--publicDir string` | Directory to serve static files | `"pb_public"` |
| `--queryTimeout int` | Default SELECT queries timeout in seconds | `30` |
| `-h, --help` | Show help information | |
| `-v, --version` | Show version information | |

## Core Commands

### serve

Starts the PocketBase web server. This is the most commonly used command for running your application.

```bash
# Basic usage (default: 127.0.0.1:8090)
./pocketbase serve

# Specify custom host and port
./pocketbase serve --http=0.0.0.0:8090

# Serve with specific domain(s)
./pocketbase serve example.com www.example.com

# Enable HTTPS with automatic HTTP to HTTPS redirect
./pocketbase serve --https=0.0.0.0:443

# Development mode with verbose logging
./pocketbase serve --dev

# Production with custom directories
./pocketbase serve --dir=/data/pocketbase --publicDir=/var/www/html
```

#### Serve-Specific Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--http string` | TCP address for HTTP server | Domain mode: `0.0.0.0:80`<br>No domain: `127.0.0.1:8090` |
| `--https string` | TCP address for HTTPS server | Domain mode: `0.0.0.0:443`<br>No domain: empty (no TLS) |
| `--origins strings` | CORS allowed domain origins list | `[*]` |

#### Common Usage Patterns

```bash
# Development server with all origins allowed
./pocketbase serve --dev --origins=http://localhost:3000,http://localhost:8080

# Production server with specific origins
./pocketbase serve --http=0.0.0.0:8090 --origins=https://app.example.com

# Behind reverse proxy (HTTPS handled by proxy)
./pocketbase serve --http=127.0.0.1:8090
```

### migrate

Manages database schema migrations. Essential for version-controlling your database structure and deploying schema changes.

```bash
# Run all available migrations
./pocketbase migrate up

# Revert the last applied migration
./pocketbase migrate down

# Revert the last 3 migrations
./pocketbase migrate down 3

# Create new blank migration template
./pocketbase migrate create add_user_profile_fields

# Create migration from current collections configuration
./pocketbase migrate collections

# Clean up migration history (remove references to deleted files)
./pocketbase migrate history-sync
```

#### Migration Arguments

| Argument | Description |
|----------|-------------|
| `up` | Runs all available migrations |
| `down [number]` | Reverts the last `[number]` applied migrations (default: 1) |
| `create name` | Creates new blank migration template file |
| `collections` | Creates migration file with snapshot of local collections configuration |
| `history-sync` | Ensures `_migrations` history table doesn't reference deleted migration files |

#### Migration Workflow

```bash
# 1. Make schema changes via Admin UI or API
# 2. Create migration to capture changes
./pocketbase migrate collections

# 3. The new migration file appears in migrations directory
# 4. Commit migration file to version control

# Deploy to production:
./pocketbase migrate up
```

> Need to move historical data between environments? Pair schema migrations with the import/export options documented in [Data Migration Workflows](data_migration.md). Keep the schema in sync first, then run the data tools.

### superuser

Manages administrator (superuser) accounts for accessing the PocketBase admin dashboard.

```bash
# Create new superuser interactively
./pocketbase superuser create

# Create superuser with email and password
./pocketbase superuser create admin@example.com password123

# Update existing superuser password
./pocketbase superuser update admin@example.com newpassword123

# Delete superuser
./pocketbase superuser delete admin@example.com

# Create or update (idempotent)
./pocketbase superuser upsert admin@example.com password123

# Generate one-time password for existing superuser
./pocketbase superuser otp admin@example.com
```

#### Superuser Sub-Commands

| Sub-command | Description | Example |
|-------------|-------------|---------|
| `create` | Creates a new superuser | `superuser create email@domain.com password` |
| `update` | Changes password of existing superuser | `superuser update email@domain.com newpassword` |
| `delete` | Deletes an existing superuser | `superuser delete email@domain.com` |
| `upsert` | Creates or updates if email exists | `superuser upsert email@domain.com password` |
| `otp` | Creates one-time password for superuser | `superuser otp email@domain.com` |

### update

Automatically updates PocketBase to the latest available version.

```bash
# Check for and apply latest update
./pocketbase update
```

## Development Workflow

### Setting Up a New Project

```bash
# 1. Create project directory
mkdir my-pocketbase-app
cd my-pocketbase-app

# 2. Download PocketBase
wget https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_0.20.0_linux_amd64.zip
unzip pocketbase_0.20.0_linux_amd64.zip
chmod +x pocketbase

# 3. Create initial superuser
./pocketbase superuser create admin@example.com password123

# 4. Start development server
./pocketbase serve --dev
```

### Daily Development Cycle

```bash
# Start server in development mode
./pocketbase serve --dev

# In another terminal, make schema changes via Admin UI
# Then create migration to capture changes
./pocketbase migrate collections

# Test your application
# When ready, commit migration file to version control
```

### Team Collaboration

```bash
# Pull latest changes from version control
git pull

# Run any new migrations
./pocketbase migrate up

# Start development server
./pocketbase serve --dev
```

## Production Deployment

### Production Server Setup

```bash
# 1. Extract PocketBase to production directory
mkdir -p /opt/pocketbase
cp pocketbase /opt/pocketbase/
cd /opt/pocketbase

# 2. Set up proper permissions
chmod +x pocketbase
mkdir -p pb_data pb_public

# 3. Create superuser if not exists
./pocketbase superuser upsert admin@example.com securepassword123

# 4. Run production server
./pocketbase serve --http=0.0.0.0:8090
```

### Using with Systemd

For service setup and production hardening guidance, see [Going to Production](going_to_production.md).

### Environment-Specific Configurations

```bash
# Development
./pocketbase serve --dev --dir=./dev_data

# Staging
./pocketbase serve --http=0.0.0.0:8090 --dir=./staging_data

# Production
./pocketbase serve --http=0.0.0.0:8090 --dir=/data/pocketbase
```

## Advanced Usage

### Custom Directories

```bash
# Custom data and public directories
./pocketbase serve --dir=/var/lib/pocketbase --publicDir=/var/www/pocketbase

# Custom migrations directory
./pocketbase migrate --migrationsDir=/opt/pocketbase/migrations
```

### Security Configuration

```bash
# Enable encryption for app settings
export PB_ENCRYPTION_KEY="your-32-character-encryption-key"
./pocketbase serve --encryptionEnv=PB_ENCRYPTION_KEY

# Restrict CORS origins in production
./pocketbase serve --origins=https://app.example.com,https://admin.example.com
```

### JavaScript Hooks

```bash
# Enable JavaScript hooks with custom directory
./pocketbase serve --hooksDir=./pb_hooks --hooksWatch

# Configure hook pool size for performance
./pocketbase serve --hooksPool=25
```

### Query Timeout Configuration

```bash
# Set longer query timeout for complex operations
./pocketbase serve --queryTimeout=120
```

## Troubleshooting

### Common Issues

#### Permission Denied
```bash
# Make executable
chmod +x pocketbase

# Check file ownership
ls -la pocketbase
```

#### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :8090

# Use different port
./pocketbase serve --http=127.0.0.1:8080
```

#### Migration Conflicts
```bash
# Check migration status
./pocketbase migrate history-sync

# Re-run migrations if needed
./pocketbase migrate down
./pocketbase migrate up
```

#### Data Directory Issues
```bash
# Ensure data directory exists and is writable
mkdir -p pb_data
chmod 755 pb_data

# Check directory permissions
ls -la pb_data/
```

### Debug Mode

```bash
# Enable development mode for verbose logging
./pocketbase serve --dev
```

Runtime logs print to stdout; when running under systemd, inspect them with `journalctl -u pocketbase -f`.

### Performance Issues

```bash
# Increase query timeout for slow queries
./pocketbase serve --queryTimeout=60

# Increase hooks pool for better concurrency
./pocketbase serve --hooksPool=50
```

## Best Practices

### Development
1. **Always use `--dev` flag** during development for detailed logging
2. **Create migrations** after making schema changes via Admin UI
3. **Commit migration files** to version control
4. **Use different data directories** for different environments
5. **Test migrations** on staging before production

### Production
1. **Never use `--dev` flag** in production
2. **Set up proper user permissions** for the PocketBase process
3. **Configure reverse proxy** (nginx/Caddy) for HTTPS
4. **Set up proper logging** and monitoring
5. **Regular backups** using the backup API
6. **Restrict CORS origins** to specific domains
7. **Use encryption** for sensitive app settings

### Security
1. **Use strong passwords** for superuser accounts
2. **Restrict origins** in production environments
3. **Enable encryption** for app settings
4. **Run as non-root user** whenever possible
5. **Keep PocketBase updated** using the update command

## CLI Scripting Examples

### Automated Setup Script

```bash
#!/bin/bash
# setup-pocketbase.sh

set -e

# Configuration
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="securepassword123"
DATA_DIR="./pb_data"

echo "🚀 Setting up PocketBase..."

# Create data directory
mkdir -p "$DATA_DIR"

# Create superuser
./pocketbase superuser upsert "$ADMIN_EMAIL" "$ADMIN_PASSWORD"

# Start server
echo "✅ PocketBase setup complete!"
echo "🌐 Admin UI: http://127.0.0.1:8090/_/"
./pocketbase serve
```

### Migration Script

```bash
#!/bin/bash
# migrate.sh

set -e

echo "🔄 Running PocketBase migrations..."

# Run all pending migrations
./pocketbase migrate up

echo "✅ Migrations complete!"
```

### Production Deployment Script

```bash
#!/bin/bash
# deploy-production.sh

set -e

# Stop existing service
sudo systemctl stop pocketbase

# Backup current data
cp -r /opt/pocketbase/pb_data /opt/pocketbase/pb_data.backup.$(date +%Y%m%d)

# Run migrations
/opt/pocketbase/pocketbase migrate up

# Start service
sudo systemctl start pocketbase

echo "✅ PocketBase deployed successfully!"
```

## Integration with Other Tools

### Docker Integration

```bash
# Build Docker image that includes custom migrations
FROM ghcr.io/pocketbase/pocketbase:latest

COPY ./migrations /pb/migrations
COPY ./pb_hooks /pb/pb_hooks

# Run migrations on startup
CMD ["sh", "-c", "./pocketbase migrate up && ./pocketbase serve --http=0.0.0.0:8090"]
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
- name: Deploy PocketBase
  run: |
    ./pocketbase migrate up
    ./pocketbase superuser upsert ${{ secrets.ADMIN_EMAIL }} ${{ secrets.ADMIN_PASSWORD }}
    systemctl restart pocketbase
```

See [Backups API](../api/api_backups.md) for backup automation techniques.

---

## Quick Reference

### Essential Commands
```bash
./pocketbase serve --dev                    # Development server
./pocketbase migrate up                    # Run migrations
./pocketbase superuser create email pass   # Create admin
./pocketbase update                        # Update PocketBase
```

### Common Flags
```bash
--dev                                      # Development mode
--http=0.0.0.0:8090                       # Custom host/port
--dir=custom_data                         # Custom data directory
--origins=https://domain.com               # CORS restrictions
```

### Production Checklist
- [ ] Remove `--dev` flag
- [ ] Set proper file permissions
- [ ] Configure reverse proxy for HTTPS
- [ ] Restrict CORS origins
- [ ] Set up monitoring and backups
- [ ] Create systemd service
- [ ] Test migration workflow