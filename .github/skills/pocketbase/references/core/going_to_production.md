# Going to Production with PocketBase

## Overview

This guide covers production deployment, optimization, security, and maintenance for PocketBase applications.

## Deployment Options

### 1. Docker Deployment

#### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  pocketbase:
    image: ghcr.io/pocketbase/pocketbase:latest
    command: serve --https=0.0.0.0:443 --http=0.0.0.0:80
    volumes:
      - ./pb_data:/pb_data
    environment:
      - PB_PUBLIC_DIR=/pb_public
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  caddy:
    image: caddy:2-alpine
    depends_on:
      - pocketbase
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./pb_data:/pb_data:ro
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
```

#### Caddyfile Configuration

Create `Caddyfile`:

```caddy
yourdomain.com {
  encode gzip

  reverse_proxy pocketbase:8090

  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "SAMEORIGIN"
    X-XSS-Protection "1; mode=block"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "camera=(), microphone=(), geolocation=()"
  }
}
```

### 2. Reverse Proxy (Nginx)

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Cloud Platform Deployment

#### Railway

```yaml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "./pocketbase serve --https=0.0.0.0:$PORT"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

#### Fly.io

```toml
# fly.toml
app = "your-app-name"

[build]
  builder = "paketobuildpacks/builder:base"

[[services]]
  internal_port = 8090
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.ports]]
    handlers = ["http"]
    port = 80

[env]
  PB_PUBLIC_DIR = "/app/public"
```

#### DigitalOcean App Platform

```yaml
name: pocketbase-app
services:
- name: pocketbase
  source_dir: /
  github:
    repo: your-username/pocketbase-repo
    branch: main
  run_command: ./pocketbase serve --https=0.0.0.0:$PORT
  environment_slug: ubuntu-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: PB_PUBLIC_DIR
    value: /app/public
  http_port: 8090
```

## Environment Configuration

### Environment Variables

```bash
# .env
PB_DATA_DIR=/pb_data
PB_PUBLIC_DIR=/pb_public

# Optional: Database encryption
PB_ENCRYPTION_KEY=your-32-character-encryption-key

# Optional: Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Optional: CORS
PB_CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

### Custom PocketBase Configuration

Create `pocketbase.js`:

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// Custom configuration
pb.baseOptions = {
  files: {
    // S3 configuration
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
  },
  // Custom auth settings
  auth: {
    tokenExpDays: 7,
  },
};

export default pb;
```

## Security Hardening

### 1. Enable HTTPS

Always use HTTPS in production:

```bash
# Using Let's Encrypt with Certbot
certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

### 2. Security Headers

Configure in reverse proxy (see Nginx/Caddy configuration above):

```
Strict-Transport-Security
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy
Referrer-Policy
Permissions-Policy
```

### 3. File Upload Security

Configure file restrictions:

```json
{
  "maxSize": 10485760,      // 10MB
  "mimeTypes": [
    "image/jpeg",
    "image/png",
    "image/gif"
  ],
  "privateFiles": true       // Enable for sensitive files
}
```

### 4. Database Encryption

Enable field-level encryption for sensitive data:

```javascript
// Enable encryption in PocketBase config
export default {
  dataDir: '/pb_data',
  encryptionEnv: 'PB_ENCRYPTION_KEY',
}
```

### 5. Rate Limiting

Implement at reverse proxy level:

```nginx
# Nginx rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://127.0.0.1:8090;
}
```

```caddy
# Caddy rate limiting
{
 限流 yourdomain.com 100  # 100 requests per second
}
```

### 6. Admin Access Restrictions

Restrict admin UI access:

```nginx
# Allow only specific IP
location /_/ {
    allow 192.168.1.0/24;
    deny all;
    proxy_pass http://127.0.0.1:8090;
}
```

## Performance Optimization

### 1. Database Indexing

Add indexes for frequently queried fields:

```sql
-- Users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(created);

-- Posts table
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created);

-- Comments table
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_created ON comments(created);
```

### 2. Query Optimization

```javascript
// Select only needed fields
const posts = await pb.collection('posts').getList(1, 50, {
  fields: 'id,title,author,created,-content'  // Exclude large fields
});

// Use filters instead of fetching all
const recentPosts = await pb.collection('posts').getList(1, 50, {
  filter: 'created >= "2024-01-01"',
  sort: '-created'
});

// Paginate properly
const page1 = await pb.collection('posts').getList(1, 50);
const page2 = await pb.collection('posts').getList(2, 50);
```

### 3. Caching

Implement caching for frequently accessed data:

```javascript
// Client-side caching
const cache = new Map();

async function getCachedPost(id) {
  if (cache.has(id)) {
    return cache.get(id);
  }

  const post = await pb.collection('posts').getOne(id);
  cache.set(id, post);
  return post;
}

// Clear cache on updates
pb.collection('posts').subscribe('*', (e) => {
  cache.delete(e.record.id);
});
```

### 4. CDN for Static Assets

Use CDN for file storage:

```javascript
// Configure CDN
const CDN_URL = 'https://cdn.yourdomain.com';
const fileUrl = `${CDN_URL}${pb.files.getURL(record, record.file)}`;
```

### 5. Connection Pooling

Configure in proxy:

```nginx
upstream pocketbase {
    server 127.0.0.1:8090;
    keepalive 32;
}

location / {
    proxy_pass http://pocketbase;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
}
```

## Monitoring and Logging

### 1. Health Check Endpoint

```bash
# Check health
curl https://yourdomain.com/api/health
# Returns: {"code":200,"data":{"status":"ok","metrics":{"clients":0}}}
```

### 2. Application Logs

```bash
# View logs
docker logs -f pocketbase

# Or redirect to file
docker logs -f pocketbase > /var/log/pocketbase.log
```

### 3. Monitoring Setup

#### Prometheus Metrics

```javascript
// Custom metrics endpoint
app.OnServe().Add("GET", "/metrics", func(e *core.ServeEvent) error {
    // Return Prometheus metrics
    return e.Next()
})
```

#### Log Aggregation

Configure log shipping:

```yaml
# Filebeat configuration
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/pocketbase.log
  fields:
    service: pocketbase
  fields_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

### 4. Error Tracking

Integrate with Sentry:

```javascript
// JavaScript SDK
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production"
});

// Capture errors
try {
  await pb.collection('posts').getList(1, 50);
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

## Backup Strategy

### 1. Automated Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/pocketbase"

# Create backup
mkdir -p $BACKUP_DIR
cp -r /pb_data $BACKUP_DIR/pb_data_$DATE

# Upload to cloud storage
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/pocketbase/

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

### 2. Point-in-Time Recovery

```bash
# Restore from backup
cd /path/to/new/pocketbase
cp -r /backups/pocketbase/pb_data_YYYYMMDD_HHMMSS/* ./pb_data/
./pocketbase migrate up
```

### 3. Cross-Region Replication

```yaml
# Docker Compose with backup service
services:
  pocketbase:
    image: ghcr.io/pocketbase/pocketbase:latest
    volumes:
      - ./pb_data:/pb_data

  backup:
    image: alpine:latest
    volumes:
      - ./pb_data:/data
      - ./backups:/backups
    command: |
      sh -c '
        while true; do
          tar czf /backups/pb_$$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
          sleep 3600
        done
      '
```

## Scaling Considerations

### 1. Vertical Scaling

Increase server resources:

```yaml
# Docker Compose
services:
  pocketbase:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
        reservations:
          memory: 1G
          cpus: '1'
```

### 2. Horizontal Scaling (Read Replicas)

For read-heavy workloads:

```nginx
# Nginx upstream
upstream pocketbase_read {
    server primary:8090;
    server replica1:8090;
    server replica2:8090;
}

location /api/records {
    proxy_pass http://pocketbase_read;
}
```

### 3. Database Scaling

Consider database sharding for very large datasets:

```sql
-- Partition large tables
CREATE TABLE posts_2024 PARTITION OF posts
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

## Common Production Issues

### Issue 1: Out of Memory

```bash
# Monitor memory usage
docker stats pocketbase

# Increase memory limit
docker run --memory=2g pocketbase
```

### Issue 2: Disk Space Full

```bash
# Check disk usage
df -h

# Clean old logs
journalctl --vacuum-time=7d

# Rotate logs
logrotate -f /etc/logrotate.conf
```

### Issue 3: Slow Queries

```sql
-- Analyze slow queries
EXPLAIN QUERY PLAN SELECT * FROM posts WHERE status = 'published';

-- Add missing indexes
CREATE INDEX idx_posts_status ON posts(status);
```

### Issue 4: SSL Certificate Issues

```bash
# Renew Let's Encrypt certificate
certbot renew --nginx

# Check certificate expiration
openssl x509 -in /path/to/cert.pem -text -noout | grep "Not After"
```

### Issue 5: CORS Errors

Update CORS settings in Admin UI:
- Go to Settings → CORS
- Add production domains
- Save changes

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review application logs
   - Check disk usage
   - Verify backup integrity
   - Monitor performance metrics

2. **Monthly**
   - Update PocketBase to latest version
   - Security audit of collections and rules
   - Review and optimize slow queries
   - Test disaster recovery procedures

3. **Quarterly**
   - Security penetration testing
   - Performance optimization review
   - Infrastructure cost review
   - Update documentation

### Update Procedure

```bash
# 1. Create backup
./backup.sh

# 2. Update PocketBase
docker pull ghcr.io/pocketbase/pocketbase:latest

# 3. Stop current instance
docker-compose down

# 4. Start with new image
docker-compose up -d

# 5. Verify functionality
curl https://yourdomain.com/api/health

# 6. Check logs
docker logs -f pocketbase
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy PocketBase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /path/to/pocketbase
            docker-compose pull
            docker-compose up -d
            ./backup.sh
```

## Best Practices Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] Security headers configured
- [ ] File upload restrictions in place
- [ ] Database encryption enabled for sensitive data
- [ ] Rate limiting configured
- [ ] Admin UI access restricted
- [ ] Database indexes added for performance
- [ ] Automated backups scheduled
- [ ] Monitoring and alerting set up
- [ ] Logs aggregated and monitored
- [ ] Environment variables configured
- [ ] CORS settings updated for production
- [ ] SSL certificate auto-renewal configured
- [ ] Disaster recovery procedure documented
- [ ] Performance benchmarks established

## Related Topics

- [Getting Started](getting_started.md) - Initial setup
- [Authentication](authentication.md) - Security best practices
- [Files Handling](files_handling.md) - File storage security
- [Security Rules](../security_rules.md) - Access control
- [API Rules & Filters](api_rules_filters.md) - Query optimization
