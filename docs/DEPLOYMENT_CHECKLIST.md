# Production Deployment Checklist — Shovel Heroes

> **Version**: 1.0.0
> **Last Updated**: 2025-10-03
> **Target Environment**: Ubuntu VM with Nginx + Docker + PostgreSQL

This checklist provides step-by-step guidance for deploying Shovel Heroes to production with maximum security and reliability.

---

## Table of Contents
1. [Pre-Deployment](#1-pre-deployment)
2. [Database Migration](#2-database-migration)
3. [Application Deployment](#3-application-deployment)
4. [Security Hardening](#4-security-hardening)
5. [Post-Deployment](#5-post-deployment)
6. [Rollback Procedures](#6-rollback-procedures)
7. [Monitoring & Maintenance](#7-monitoring--maintenance)

---

## 1. Pre-Deployment

### 1.1 Environment Variables Verification

**Location**: `/home/thc1006/dev/shovel-heroes/.env.production`

- [ ] **Create production environment file**
  ```bash
  cp .env.example .env.production
  ```

- [ ] **Generate secure JWT secret** (minimum 32 characters)
  ```bash
  openssl rand -base64 32
  # Example output: 4vesaOIX7REnAzHEG9f8WHu431sHyH85zFoWhzl6KO4=
  ```

- [ ] **Configure database connection**
  ```bash
  # In .env.production
  DATABASE_URL=postgres://postgres:SECURE_PASSWORD@localhost:5432/shovelheroes
  POSTGRES_PASSWORD=SECURE_PASSWORD_HERE
  ```

- [ ] **Set production API base URL**
  ```bash
  # In .env.production
  VITE_API_BASE=https://your-domain.com/api
  # OR for IP-based deployment:
  VITE_API_BASE=https://31.41.34.19/api
  ```

- [ ] **Configure CORS allowlist**
  ```bash
  # In .env.production - NO WILDCARDS IN PRODUCTION!
  CORS_ALLOWLIST=https://your-domain.com,https://www.your-domain.com
  ```

- [ ] **Set production SMTP (if not using MailHog)**
  ```bash
  SMTP_HOST=smtp.sendgrid.net  # or your SMTP provider
  SMTP_PORT=587
  SMTP_USER=your_smtp_user
  SMTP_PASS=your_smtp_password
  SMTP_FROM=noreply@your-domain.com
  ```

- [ ] **Verify OpenTelemetry configuration**
  ```bash
  OTEL_ENABLED=true
  OTEL_SERVICE_NAME=shovel-heroes-api
  # Optional: Configure OTLP endpoint for observability
  # OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
  ```

- [ ] **Run environment validation script**
  ```bash
  cd /home/thc1006/dev/shovel-heroes
  bash scripts/verify-env.sh
  ```

### 1.2 SSL/TLS Certificate Setup

**Using Let's Encrypt with Certbot:**

- [ ] **Install Certbot**
  ```bash
  sudo apt update
  sudo apt install certbot python3-certbot-nginx -y
  ```

- [ ] **Obtain SSL certificate** (HTTP-01 challenge)
  ```bash
  sudo certbot --nginx -d your-domain.com -d www.your-domain.com
  ```

- [ ] **Verify auto-renewal timer**
  ```bash
  sudo systemctl status certbot.timer
  sudo certbot renew --dry-run
  ```

- [ ] **Update Nginx configuration** to use certificates
  ```bash
  # Certbot should auto-configure, but verify:
  sudo nano /etc/nginx/sites-available/shovelheroes.conf

  # Should contain:
  # listen 443 ssl;
  # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
  ```

### 1.3 Database Backup Procedure

- [ ] **Create backup directory**
  ```bash
  sudo mkdir -p /var/backups/shovelheroes
  sudo chown $USER:$USER /var/backups/shovelheroes
  ```

- [ ] **Backup existing database** (if upgrading)
  ```bash
  pg_dump -U postgres -h localhost shovelheroes > /var/backups/shovelheroes/backup-$(date +%Y%m%d-%H%M%S).sql

  # Or using Docker:
  docker exec shovelheroes-postgres pg_dump -U postgres shovelheroes | gzip > /var/backups/shovelheroes/backup-$(date +%Y%m%d-%H%M%S).sql.gz
  ```

- [ ] **Verify backup integrity**
  ```bash
  # Check file size and content
  ls -lh /var/backups/shovelheroes/
  gunzip -c /var/backups/shovelheroes/backup-*.sql.gz | head -n 20
  ```

- [ ] **Test backup restoration** (on staging/dev database)
  ```bash
  # Create test database
  createdb -U postgres shovelheroes_test

  # Restore backup
  gunzip -c /var/backups/shovelheroes/backup-*.sql.gz | psql -U postgres shovelheroes_test

  # Verify tables
  psql -U postgres shovelheroes_test -c "\dt"
  ```

### 1.4 Security Audit Completion

- [ ] **Run dependency audit**
  ```bash
  npm audit --production
  npm audit fix --production
  ```

- [ ] **Check for vulnerable dependencies**
  ```bash
  cd packages/backend
  npm audit --production
  ```

- [ ] **Verify OpenAPI specification**
  ```bash
  npm run openapi:lint
  npm run openapi:preview
  ```

- [ ] **Review security headers** (Helmet configuration)
  ```bash
  # In packages/backend/src/app.ts
  # Verify Helmet is configured with:
  # - contentSecurityPolicy
  # - hsts
  # - noSniff
  # - xssFilter
  ```

- [ ] **Test rate limiting**
  ```bash
  # Verify RATE_LIMIT_MAX and RATE_LIMIT_WINDOW in .env.production
  # Default: 300 requests per minute per IP
  ```

---

## 2. Database Migration

### 2.1 Migration Testing in Staging

- [ ] **Create staging database**
  ```bash
  createdb -U postgres shovelheroes_staging
  ```

- [ ] **Restore production backup to staging**
  ```bash
  gunzip -c /var/backups/shovelheroes/backup-latest.sql.gz | psql -U postgres shovelheroes_staging
  ```

- [ ] **Test migrations on staging**
  ```bash
  cd /home/thc1006/dev/shovel-heroes/packages/backend

  # Set staging database URL
  export DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes_staging

  # Run migrations
  npm run migrate:up
  ```

- [ ] **Verify migration results**
  ```bash
  psql -U postgres shovelheroes_staging -c "\dt"
  psql -U postgres shovelheroes_staging -c "SELECT version FROM pgmigrations ORDER BY id DESC LIMIT 5;"
  ```

### 2.2 Rollback Plan Ready

- [ ] **Document current migration version**
  ```bash
  psql -U postgres shovelheroes -c "SELECT id, name FROM pgmigrations ORDER BY id DESC LIMIT 1;"
  # Save output for rollback reference
  ```

- [ ] **Prepare rollback commands**
  ```bash
  # In case of migration failure:
  cd /home/thc1006/dev/shovel-heroes/packages/backend

  # Rollback last migration:
  npm run migrate:down

  # Rollback specific number of migrations:
  npm run migrate:down -- -m 3  # Rollback 3 migrations
  ```

- [ ] **Test rollback on staging**
  ```bash
  export DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes_staging
  npm run migrate:down
  npm run migrate:up
  ```

### 2.3 Migration Execution Steps

- [ ] **Enable maintenance mode** (optional - update Nginx)
  ```bash
  sudo cp /etc/nginx/sites-available/maintenance.conf /etc/nginx/sites-enabled/shovelheroes.conf
  sudo nginx -t && sudo systemctl reload nginx
  ```

- [ ] **Stop application containers**
  ```bash
  cd /home/thc1006/dev/shovel-heroes
  docker compose -f docker-compose.production.yml stop backend frontend
  ```

- [ ] **Create pre-migration backup**
  ```bash
  docker exec shovelheroes-postgres pg_dump -U postgres shovelheroes | gzip > /var/backups/shovelheroes/pre-migration-$(date +%Y%m%d-%H%M%S).sql.gz
  ```

- [ ] **Execute migrations**
  ```bash
  cd /home/thc1006/dev/shovel-heroes/packages/backend

  # Set production database URL
  export DATABASE_URL=postgres://postgres:PRODUCTION_PASSWORD@localhost:5432/shovelheroes

  # Run migrations
  npm run migrate:up
  ```

- [ ] **Verify migration success**
  ```bash
  psql -U postgres shovelheroes -c "SELECT id, name, run_on FROM pgmigrations ORDER BY id DESC LIMIT 5;"

  # Check for new tables/columns
  psql -U postgres shovelheroes -c "\d+ users"
  psql -U postgres shovelheroes -c "\d+ grids"
  ```

---

## 3. Application Deployment

### 3.1 Build Verification

- [ ] **Install production dependencies**
  ```bash
  cd /home/thc1006/dev/shovel-heroes
  npm ci --production
  ```

- [ ] **Build backend**
  ```bash
  cd packages/backend
  npm run build

  # Verify build output
  ls -la dist/
  node dist/server.js --version
  ```

- [ ] **Build frontend**
  ```bash
  cd /home/thc1006/dev/shovel-heroes
  npm run build:web

  # Verify build output
  ls -la dist/
  du -sh dist/  # Check bundle size
  ```

- [ ] **Run linting and type checks**
  ```bash
  cd packages/backend
  npm run lint
  npm run format:check
  ```

### 3.2 Docker Deployment

- [ ] **Build Docker images**
  ```bash
  cd /home/thc1006/dev/shovel-heroes
  docker compose -f docker-compose.production.yml build --no-cache
  ```

- [ ] **Verify Docker images**
  ```bash
  docker images | grep shovelheroes
  ```

- [ ] **Start services using deployment script**
  ```bash
  cd /home/thc1006/dev/shovel-heroes
  bash scripts/deploy.sh
  ```

- [ ] **Verify container health**
  ```bash
  docker compose -f docker-compose.production.yml ps
  docker compose -f docker-compose.production.yml logs backend --tail=50
  docker compose -f docker-compose.production.yml logs frontend --tail=50
  ```

### 3.3 Nginx Configuration

- [ ] **Copy production Nginx config**
  ```bash
  sudo cp /home/thc1006/dev/shovel-heroes/infra/nginx/shovelheroes.conf /etc/nginx/sites-available/shovelheroes
  ```

- [ ] **Update server_name and SSL paths**
  ```bash
  sudo nano /etc/nginx/sites-available/shovelheroes

  # Update:
  # server_name your-domain.com www.your-domain.com;
  # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
  ```

- [ ] **Enable site configuration**
  ```bash
  sudo ln -sf /etc/nginx/sites-available/shovelheroes /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site
  ```

- [ ] **Test Nginx configuration**
  ```bash
  sudo nginx -t
  ```

- [ ] **Reload Nginx**
  ```bash
  sudo systemctl reload nginx
  sudo systemctl status nginx
  ```

### 3.4 Health Check Endpoints

- [ ] **Test backend health endpoint**
  ```bash
  curl -i http://localhost:8787/healthz
  # Expected: 200 OK with JSON response
  ```

- [ ] **Test API through Nginx proxy**
  ```bash
  curl -i http://localhost/api/healthz
  # Expected: 200 OK
  ```

- [ ] **Test HTTPS health endpoint** (if SSL configured)
  ```bash
  curl -i https://your-domain.com/api/healthz
  # Expected: 200 OK
  ```

### 3.5 Monitoring Setup (OpenTelemetry)

- [ ] **Verify OpenTelemetry is enabled**
  ```bash
  # In .env.production
  grep OTEL_ENABLED .env.production
  # Should output: OTEL_ENABLED=true
  ```

- [ ] **Check OpenTelemetry initialization**
  ```bash
  docker compose -f docker-compose.production.yml logs backend | grep -i "otel\|telemetry"
  ```

- [ ] **Configure OTLP exporter** (optional - for external observability)
  ```bash
  # In .env.production, add:
  # OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
  # OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY
  ```

- [ ] **Test trace generation**
  ```bash
  # Make several API calls
  for i in {1..5}; do
    curl -s http://localhost/api/healthz > /dev/null
  done

  # Check logs for trace IDs
  docker compose -f docker-compose.production.yml logs backend --tail=20 | grep trace
  ```

### 3.6 Log Aggregation

- [ ] **Configure log rotation**
  ```bash
  sudo nano /etc/logrotate.d/shovelheroes
  ```

  Add configuration:
  ```
  /var/log/nginx/shovelheroes-*.log {
      daily
      missingok
      rotate 14
      compress
      delaycompress
      notifempty
      create 0640 www-data adm
      sharedscripts
      postrotate
          [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
      endscript
  }
  ```

- [ ] **Test log rotation**
  ```bash
  sudo logrotate -f /etc/logrotate.d/shovelheroes
  ls -la /var/log/nginx/
  ```

- [ ] **Set up Docker log limits**
  ```bash
  # In docker-compose.production.yml, add to each service:
  # logging:
  #   driver: "json-file"
  #   options:
  #     max-size: "10m"
  #     max-file: "3"
  ```

---

## 4. Security Hardening

### 4.1 JWT Secret Rotation

- [ ] **Generate new production JWT secret**
  ```bash
  openssl rand -base64 32
  # Store in secure password manager
  ```

- [ ] **Update JWT_SECRET in .env.production**
  ```bash
  # NEVER commit this to git!
  nano .env.production
  # JWT_SECRET=NEW_SECURE_SECRET_HERE
  ```

- [ ] **Restart backend to apply new secret**
  ```bash
  docker compose -f docker-compose.production.yml restart backend
  ```

- [ ] **Invalidate all existing tokens** (users will need to re-login)
  ```bash
  # This happens automatically when JWT_SECRET changes
  # Consider adding a notification to users
  ```

### 4.2 CORS Configuration

- [ ] **Set strict CORS allowlist**
  ```bash
  # In .env.production - NO wildcards!
  CORS_ALLOWLIST=https://your-domain.com,https://www.your-domain.com
  ```

- [ ] **Remove development origins**
  ```bash
  # Remove: http://localhost, http://localhost:5173
  ```

- [ ] **Test CORS headers**
  ```bash
  curl -H "Origin: https://your-domain.com" \
       -H "Access-Control-Request-Method: POST" \
       -H "Access-Control-Request-Headers: Content-Type" \
       -X OPTIONS \
       http://localhost:8787/api/grids

  # Should include:
  # Access-Control-Allow-Origin: https://your-domain.com
  ```

- [ ] **Test blocked origin**
  ```bash
  curl -H "Origin: https://evil-site.com" \
       -X GET \
       http://localhost:8787/api/healthz

  # Should NOT include Access-Control-Allow-Origin header
  ```

### 4.3 Rate Limiting Settings

- [ ] **Configure production rate limits**
  ```bash
  # In .env.production
  RATE_LIMIT_MAX=300           # 300 requests per window
  RATE_LIMIT_WINDOW=1 minute   # 1 minute window
  ```

- [ ] **Test rate limiting**
  ```bash
  # Make rapid requests
  for i in {1..305}; do
    curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/healthz
  done

  # Last requests should return 429 (Too Many Requests)
  ```

- [ ] **Configure rate limit exceptions** (if needed)
  ```bash
  # In packages/backend/src/app.ts
  # Add allowList for trusted IPs (monitoring systems, etc.)
  ```

### 4.4 Helmet Security Headers

- [ ] **Verify Helmet configuration**
  ```bash
  # Check packages/backend/src/app.ts includes:
  grep -A 10 "helmet" packages/backend/src/app.ts
  ```

- [ ] **Test security headers**
  ```bash
  curl -I http://localhost:8787/api/healthz

  # Should include:
  # X-Content-Type-Options: nosniff
  # X-Frame-Options: SAMEORIGIN
  # X-XSS-Protection: 0
  # Strict-Transport-Security: max-age=15552000; includeSubDomains
  ```

- [ ] **Configure Content Security Policy**
  ```bash
  # In packages/backend/src/app.ts, add CSP:
  # contentSecurityPolicy: {
  #   directives: {
  #     defaultSrc: ["'self'"],
  #     styleSrc: ["'self'", "'unsafe-inline'"],
  #     scriptSrc: ["'self'"],
  #     imgSrc: ["'self'", "data:", "https:"]
  #   }
  # }
  ```

### 4.5 Database Security

- [ ] **Change default PostgreSQL password**
  ```bash
  docker exec -it shovelheroes-postgres psql -U postgres
  \password postgres
  # Enter new secure password

  # Update .env.production and docker-compose.production.yml
  ```

- [ ] **Verify Row-Level Security (RLS) policies**
  ```bash
  psql -U postgres shovelheroes -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE rowsecurity = true;"
  ```

- [ ] **Test RLS enforcement**
  ```bash
  # Run backend tests that verify RLS
  cd packages/backend
  npm run test -- tests/routes/grids.test.ts
  ```

- [ ] **Restrict database network access**
  ```bash
  # In docker-compose.production.yml, remove public port binding:
  # db:
  #   ports:
  #     - "5432:5432"  # REMOVE THIS IN PRODUCTION
  ```

### 4.6 Firewall Configuration

- [ ] **Install and enable UFW**
  ```bash
  sudo apt install ufw
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  ```

- [ ] **Allow SSH (IMPORTANT - do this first!)**
  ```bash
  sudo ufw allow ssh
  sudo ufw allow 22/tcp
  ```

- [ ] **Allow HTTP and HTTPS**
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  ```

- [ ] **Enable firewall**
  ```bash
  sudo ufw enable
  sudo ufw status verbose
  ```

---

## 5. Post-Deployment

### 5.1 Smoke Tests

- [ ] **Test frontend loads**
  ```bash
  curl -I https://your-domain.com/
  # Expected: 200 OK
  ```

- [ ] **Test API health**
  ```bash
  curl https://your-domain.com/api/healthz
  # Expected: {"status":"ok","timestamp":"..."}
  ```

- [ ] **Test user registration**
  ```bash
  curl -X POST https://your-domain.com/api/users/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "SecurePass123!",
      "full_name": "Test User",
      "role": "volunteer"
    }'

  # Expected: 201 Created with user object
  ```

- [ ] **Test user login**
  ```bash
  curl -X POST https://your-domain.com/api/users/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "SecurePass123!"
    }'

  # Expected: 200 OK with JWT token
  ```

- [ ] **Test authenticated request**
  ```bash
  TOKEN="your_jwt_token_here"
  curl -H "Authorization: Bearer $TOKEN" \
       https://your-domain.com/api/grids

  # Expected: 200 OK with grids array
  ```

- [ ] **Test CRUD operations**
  ```bash
  # Create grid (as admin)
  # Update grid
  # Delete grid
  # Verify RLS policies work correctly
  ```

### 5.2 Performance Monitoring

- [ ] **Check initial response times**
  ```bash
  # Test API response time
  time curl -s https://your-domain.com/api/healthz

  # Should be < 100ms
  ```

- [ ] **Monitor server resources**
  ```bash
  # CPU and memory usage
  docker stats shovelheroes-backend shovelheroes-frontend shovelheroes-postgres
  ```

- [ ] **Check database connection pool**
  ```bash
  docker compose -f docker-compose.production.yml logs backend | grep -i "pool\|connection"
  ```

- [ ] **Set up basic monitoring** (optional - Prometheus/Grafana)
  ```bash
  # Install node_exporter for system metrics
  # Install postgres_exporter for database metrics
  # Configure Grafana dashboard
  ```

### 5.3 Error Tracking

- [ ] **Review application logs**
  ```bash
  docker compose -f docker-compose.production.yml logs backend --tail=100
  docker compose -f docker-compose.production.yml logs frontend --tail=100
  ```

- [ ] **Check for errors or warnings**
  ```bash
  docker compose -f docker-compose.production.yml logs backend | grep -i "error\|warn"
  ```

- [ ] **Set up log monitoring** (optional - Sentry/LogRocket)
  ```bash
  # Add Sentry DSN to .env.production
  # VITE_SENTRY_DSN=https://...@sentry.io/...
  ```

- [ ] **Configure error alerting**
  ```bash
  # Set up email/Slack notifications for critical errors
  # Configure dead letter queue for failed jobs
  ```

### 5.4 User Acceptance Testing

- [ ] **Create test user accounts**
  ```bash
  # Create accounts for each role: volunteer, coordinator, admin, grid_manager
  ```

- [ ] **Test user workflows**
  - [ ] Registration and email verification
  - [ ] Login and authentication
  - [ ] Password reset
  - [ ] Profile update
  - [ ] Grid creation and management
  - [ ] Volunteer registration
  - [ ] Admin panel access
  - [ ] Supply donations
  - [ ] Announcements

- [ ] **Test mobile responsiveness**
  ```bash
  # Use browser dev tools to test various screen sizes
  # Test on actual mobile devices
  ```

- [ ] **Test accessibility**
  ```bash
  # Run Lighthouse audit
  npm install -g @lhci/cli
  lhci autorun --collect.url=https://your-domain.com
  ```

### 5.5 Backup Verification

- [ ] **Create post-deployment backup**
  ```bash
  docker exec shovelheroes-postgres pg_dump -U postgres shovelheroes | gzip > /var/backups/shovelheroes/post-deploy-$(date +%Y%m%d-%H%M%S).sql.gz
  ```

- [ ] **Set up automated daily backups**
  ```bash
  # Create backup script
  sudo nano /usr/local/bin/backup-shovelheroes.sh
  ```

  Add script:
  ```bash
  #!/bin/bash
  BACKUP_DIR=/var/backups/shovelheroes
  DATE=$(date +%Y%m%d-%H%M%S)
  docker exec shovelheroes-postgres pg_dump -U postgres shovelheroes | gzip > $BACKUP_DIR/daily-$DATE.sql.gz

  # Keep only last 7 daily backups
  find $BACKUP_DIR -name "daily-*.sql.gz" -mtime +7 -delete
  ```

- [ ] **Make script executable and schedule**
  ```bash
  sudo chmod +x /usr/local/bin/backup-shovelheroes.sh

  # Add to crontab
  sudo crontab -e
  # Add line: 0 2 * * * /usr/local/bin/backup-shovelheroes.sh
  ```

- [ ] **Test backup restoration**
  ```bash
  # Create temporary database
  createdb -U postgres shovelheroes_restore_test

  # Restore latest backup
  gunzip -c /var/backups/shovelheroes/daily-latest.sql.gz | psql -U postgres shovelheroes_restore_test

  # Verify data
  psql -U postgres shovelheroes_restore_test -c "SELECT COUNT(*) FROM users;"

  # Cleanup
  dropdb -U postgres shovelheroes_restore_test
  ```

---

## 6. Rollback Procedures

### 6.1 Application Version Rollback

- [ ] **Stop current version**
  ```bash
  cd /home/thc1006/dev/shovel-heroes
  docker compose -f docker-compose.production.yml down
  ```

- [ ] **Checkout previous version**
  ```bash
  git log --oneline -5  # Find previous stable commit
  git checkout <previous-commit-hash>
  ```

- [ ] **Rebuild and deploy previous version**
  ```bash
  docker compose -f docker-compose.production.yml build --no-cache
  bash scripts/deploy.sh
  ```

- [ ] **Verify rollback success**
  ```bash
  curl https://your-domain.com/api/healthz
  docker compose -f docker-compose.production.yml ps
  ```

### 6.2 Database Rollback Steps

- [ ] **Stop application**
  ```bash
  docker compose -f docker-compose.production.yml stop backend
  ```

- [ ] **Backup current state** (before rollback)
  ```bash
  docker exec shovelheroes-postgres pg_dump -U postgres shovelheroes | gzip > /var/backups/shovelheroes/pre-rollback-$(date +%Y%m%d-%H%M%S).sql.gz
  ```

- [ ] **Rollback migrations**
  ```bash
  cd /home/thc1006/dev/shovel-heroes/packages/backend
  export DATABASE_URL=postgres://postgres:PASSWORD@localhost:5432/shovelheroes

  # Rollback specific number of migrations
  npm run migrate:down -- -m 2  # Rollback 2 migrations
  ```

- [ ] **OR restore from backup** (if migration rollback fails)
  ```bash
  # Drop and recreate database
  docker exec -it shovelheroes-postgres psql -U postgres -c "DROP DATABASE shovelheroes;"
  docker exec -it shovelheroes-postgres psql -U postgres -c "CREATE DATABASE shovelheroes;"

  # Restore backup
  gunzip -c /var/backups/shovelheroes/pre-migration-TIMESTAMP.sql.gz | docker exec -i shovelheroes-postgres psql -U postgres shovelheroes
  ```

- [ ] **Verify database state**
  ```bash
  psql -U postgres shovelheroes -c "\dt"
  psql -U postgres shovelheroes -c "SELECT version FROM pgmigrations ORDER BY id DESC LIMIT 5;"
  ```

- [ ] **Restart application**
  ```bash
  docker compose -f docker-compose.production.yml start backend
  ```

### 6.3 Cache Clearing

- [ ] **Clear Nginx cache** (if configured)
  ```bash
  sudo rm -rf /var/cache/nginx/*
  sudo systemctl reload nginx
  ```

- [ ] **Clear browser cache** (instruct users)
  ```
  Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
  ```

- [ ] **Clear application cache** (if implemented)
  ```bash
  # If using Redis or similar
  docker exec shovelheroes-redis redis-cli FLUSHALL
  ```

### 6.4 DNS Updates (if needed)

- [ ] **Update DNS A record** (if changing servers)
  ```bash
  # In your DNS provider (Cloudflare, Route53, etc.)
  # Update A record to point to new/old IP
  ```

- [ ] **Verify DNS propagation**
  ```bash
  dig your-domain.com
  nslookup your-domain.com
  ```

- [ ] **Wait for TTL expiration**
  ```bash
  # Typically 300-3600 seconds depending on your DNS TTL
  ```

---

## 7. Monitoring & Maintenance

### 7.1 Daily Monitoring

- [ ] **Check service health**
  ```bash
  docker compose -f docker-compose.production.yml ps
  curl https://your-domain.com/api/healthz
  ```

- [ ] **Review error logs**
  ```bash
  docker compose -f docker-compose.production.yml logs backend --tail=50 | grep -i error
  ```

- [ ] **Monitor disk space**
  ```bash
  df -h
  du -sh /var/lib/docker/volumes/*
  du -sh /var/backups/shovelheroes/
  ```

- [ ] **Check SSL certificate expiry**
  ```bash
  sudo certbot certificates
  # Or
  echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
  ```

### 7.2 Weekly Maintenance

- [ ] **Review database backup status**
  ```bash
  ls -lh /var/backups/shovelheroes/ | tail -7
  ```

- [ ] **Check database size and vacuum**
  ```bash
  docker exec shovelheroes-postgres psql -U postgres shovelheroes -c "SELECT pg_size_pretty(pg_database_size('shovelheroes'));"
  docker exec shovelheroes-postgres psql -U postgres shovelheroes -c "VACUUM ANALYZE;"
  ```

- [ ] **Review application logs for patterns**
  ```bash
  docker compose -f docker-compose.production.yml logs backend --since 7d | grep -i "warn\|error" | wc -l
  ```

- [ ] **Update dependencies** (in staging first!)
  ```bash
  npm outdated
  npm audit
  ```

### 7.3 Monthly Tasks

- [ ] **Security updates**
  ```bash
  sudo apt update
  sudo apt upgrade -y
  sudo reboot  # If kernel updates
  ```

- [ ] **Review access logs**
  ```bash
  sudo goaccess /var/log/nginx/access.log --log-format=COMBINED
  ```

- [ ] **Performance audit**
  ```bash
  # Run Lighthouse audit
  lhci autorun --collect.url=https://your-domain.com
  ```

- [ ] **Backup verification**
  ```bash
  # Test restore from random backup
  # Verify data integrity
  ```

---

## Emergency Contacts

- **DevOps Lead**: [Your Name] - [Email/Phone]
- **Database Admin**: [Name] - [Email/Phone]
- **Security Officer**: [Name] - [Email/Phone]
- **On-Call Engineer**: [Name] - [Email/Phone]

---

## Useful Commands Reference

### Docker Commands
```bash
# View logs
docker compose -f docker-compose.production.yml logs -f backend

# Restart service
docker compose -f docker-compose.production.yml restart backend

# Execute command in container
docker compose -f docker-compose.production.yml exec backend sh

# View resource usage
docker stats

# Cleanup unused resources
docker system prune -a --volumes
```

### Database Commands
```bash
# Connect to database
docker exec -it shovelheroes-postgres psql -U postgres shovelheroes

# List tables
docker exec shovelheroes-postgres psql -U postgres shovelheroes -c "\dt"

# Backup database
docker exec shovelheroes-postgres pg_dump -U postgres shovelheroes > backup.sql

# Restore database
cat backup.sql | docker exec -i shovelheroes-postgres psql -U postgres shovelheroes
```

### Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### SSL Commands
```bash
# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# View certificates
sudo certbot certificates
```

---

## Deployment Checklist Summary

**Before deployment:**
- ✅ All environment variables configured
- ✅ SSL certificates obtained
- ✅ Database backed up
- ✅ Security audit passed

**During deployment:**
- ✅ Migrations tested and executed
- ✅ Application built and deployed
- ✅ Health checks passing

**After deployment:**
- ✅ Smoke tests passed
- ✅ Monitoring configured
- ✅ Backups verified
- ✅ Rollback plan documented

---

**Document Version**: 1.0.0
**Last Review**: 2025-10-03
**Next Review**: 2025-11-03
