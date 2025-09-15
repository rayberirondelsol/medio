# Production Deployment Guide for Medio Video Platform

This comprehensive guide covers all aspects of deploying the Medio video platform to production, including security hardening, performance optimization, monitoring, and maintenance procedures.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [SSL/TLS Configuration](#ssltls-configuration)
5. [Security Hardening](#security-hardening)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Backup and Recovery](#backup-and-recovery)
9. [CDN Configuration](#cdn-configuration)
10. [Deployment Process](#deployment-process)
11. [Post-Deployment Verification](#post-deployment-verification)
12. [Maintenance Procedures](#maintenance-procedures)

## Pre-Deployment Checklist

Before deploying to production, ensure all items are completed:

- [ ] All environment variables configured in `.env.production`
- [ ] Secure JWT_SECRET and COOKIE_SECRET generated (64+ characters)
- [ ] Database credentials set and tested
- [ ] SSL certificates obtained (Let's Encrypt or commercial)
- [ ] Sentry account created and DSN configured
- [ ] Backup strategy implemented and tested
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Documentation reviewed and updated
- [ ] Rollback plan prepared

## Environment Configuration

### 1. Generate Secure Secrets

```bash
# Generate JWT secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate Cookie secret
node -e "console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Or use the provided script
node backend/src/scripts/generate-secrets.js
```

### 2. Configure Production Environment

```bash
# Copy example configuration
cp .env.production.example .env.production

# Edit with your production values
nano .env.production
```

**Critical variables to set:**
- `NODE_ENV=production`
- `FRONTEND_URL=https://your-domain.com`
- `DATABASE_URL` with SSL mode
- `JWT_SECRET` (64+ characters)
- `COOKIE_SECRET` (64+ characters)
- `SENTRY_DSN` for error tracking

### 3. Validate Configuration

```bash
# Test environment configuration
node -e "require('dotenv').config({path: '.env.production'}); console.log('Config OK');"
```

## Database Setup

### 1. Create Production Database

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE medio_production;
CREATE USER medio_prod WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE medio_production TO medio_prod;

-- Enable SSL requirement
ALTER USER medio_prod SET sslmode TO 'require';
```

### 2. Run Migrations

```bash
# Set production environment
export NODE_ENV=production

# Run database migrations
cd backend
npm run migrate

# Optionally seed initial data (admin user, etc.)
# npm run seed:production
```

### 3. Create Indexes for Performance

```bash
# Run index creation script
node backend/src/db/add-indexes.js
```

### 4. Configure Connection Pooling

Optimal settings in `.env.production`:
```env
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000
```

## SSL/TLS Configuration

### 1. Obtain SSL Certificate

**Option A: Let's Encrypt (Free)**

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d medio.example.com -d www.medio.example.com

# Set up auto-renewal
sudo certbot renew --dry-run
```

**Option B: Commercial Certificate**

1. Generate CSR (Certificate Signing Request)
2. Purchase certificate from provider
3. Install certificate files in `/etc/ssl/certs/`

### 2. Configure Nginx for SSL

```bash
# Copy production nginx configuration
sudo cp nginx.production.conf /etc/nginx/sites-available/medio

# Update domain names in configuration
sudo nano /etc/nginx/sites-available/medio

# Enable site
sudo ln -s /etc/nginx/sites-available/medio /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 3. Test SSL Configuration

```bash
# Test with SSL Labs
curl https://www.ssllabs.com/ssltest/analyze.html?d=medio.example.com

# Test locally
openssl s_client -connect medio.example.com:443 -servername medio.example.com
```

## Security Hardening

### 1. System Security

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade

# Configure firewall
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable

# Install fail2ban for brute force protection
sudo apt-get install fail2ban
```

### 2. Application Security

- ✅ CSRF protection enabled
- ✅ Rate limiting configured
- ✅ Helmet.js security headers
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Secure session management

### 3. Database Security

```bash
# Restrict database access
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: ssl = on

# Edit pg_hba.conf for SSL-only connections
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: hostssl all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 4. Regular Security Updates

```bash
# Set up unattended upgrades
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## Performance Optimization

### 1. Enable Caching

**Nginx Static Asset Caching:**
- Already configured in `nginx.production.conf`
- Static assets: 1 year cache
- Media files: 30 days cache

**Redis Caching (Optional):**

```bash
# Install Redis
sudo apt-get install redis-server

# Configure in .env.production
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
```

### 2. Enable Gzip Compression

Already configured in nginx, verify with:
```bash
curl -H "Accept-Encoding: gzip" -I https://medio.example.com
```

### 3. Database Query Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM watch_sessions WHERE profile_id = 1;

-- Update statistics
ANALYZE;

-- Vacuum database
VACUUM ANALYZE;
```

### 4. Enable Node.js Clustering

Set in `.env.production`:
```env
CLUSTER_ENABLED=true
WORKER_PROCESSES=0  # Use all CPU cores
```

## Monitoring and Alerting

### 1. Application Monitoring (Sentry)

1. Create account at [sentry.io](https://sentry.io)
2. Create new project for Node.js
3. Copy DSN to `.env.production`
4. Configure alerts:
   - Error rate threshold
   - Performance degradation
   - Custom alerts for critical errors

### 2. Server Monitoring

**Option A: Prometheus + Grafana**

```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar xvf prometheus-2.40.0.linux-amd64.tar.gz
sudo mv prometheus-2.40.0.linux-amd64 /opt/prometheus

# Install Grafana
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
sudo apt-get update
sudo apt-get install grafana
```

**Option B: Cloud Monitoring**
- AWS CloudWatch
- Google Cloud Monitoring
- Azure Monitor
- Datadog
- New Relic

### 3. Uptime Monitoring

Configure external monitoring:
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://www.pingdom.com)
- [StatusCake](https://www.statuscake.com)

Monitor endpoints:
- `https://medio.example.com/api/health`
- `https://medio.example.com`

### 4. Log Management

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/medio

# Add configuration:
/var/log/medio/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

## Backup and Recovery

### 1. Automated Database Backups

```bash
# Set up backup directory
sudo mkdir -p /var/backups/medio
sudo chown medio:medio /var/backups/medio

# Add to crontab for daily backups at 2 AM
crontab -e
0 2 * * * /usr/bin/node /home/medio/backend/src/scripts/backup-database.js --upload-s3

# Test backup script
node backend/src/scripts/backup-database.js
```

### 2. File System Backups

```bash
# Backup user uploads and media files
rsync -avz /var/www/medio/uploads/ /backup/medio/uploads/

# Or use S3 sync
aws s3 sync /var/www/medio/uploads/ s3://medio-backups/uploads/
```

### 3. Recovery Testing

```bash
# Test database restore
node backend/src/scripts/restore-database.js --latest

# Verify backup integrity monthly
```

### 4. Disaster Recovery Plan

Document and test:
1. Database restoration procedure
2. Application deployment from scratch
3. DNS failover configuration
4. Data recovery time objective (RTO)
5. Recovery point objective (RPO)

## CDN Configuration

### 1. CloudFlare Setup (Recommended)

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain
3. Update nameservers
4. Configure:
   - SSL/TLS: Full (strict)
   - Caching Level: Standard
   - Browser Cache TTL: 1 year
   - Always Use HTTPS: On

### 2. AWS CloudFront (Alternative)

```bash
# Configure in AWS Console or CLI
aws cloudfront create-distribution \
  --origin-domain-name medio.example.com \
  --default-root-object index.html
```

### 3. Configure Application for CDN

```bash
# Set in .env.production
REACT_APP_CDN_URL=https://cdn.medio.example.com
REACT_APP_CDN_ENABLED=true
```

### 4. Verify CDN

```bash
# Check CDN headers
curl -I https://cdn.medio.example.com/static/css/main.css

# Look for CDN cache headers
# x-cache: HIT
# cf-cache-status: HIT
```

## Deployment Process

### 1. Build Application

```bash
# Frontend build
npm run build

# Backend preparation
cd backend
npm ci --production
```

### 2. Deploy with Docker

```bash
# Build production images
docker-compose -f docker-compose.full.yml build

# Deploy
docker-compose -f docker-compose.full.yml up -d

# Verify deployment
docker-compose ps
docker-compose logs -f
```

### 3. Deploy without Docker

```bash
# Copy files to server
rsync -avz --exclude node_modules . medio@server:/var/www/medio/

# On server: Install dependencies
cd /var/www/medio
npm ci --production
cd backend
npm ci --production

# Start with PM2
pm2 start backend/src/server.js --name medio-backend
pm2 save
pm2 startup
```

### 4. Zero-Downtime Deployment

```bash
# Blue-Green deployment strategy
# 1. Deploy to staging environment
# 2. Run smoke tests
# 3. Switch load balancer
# 4. Monitor for issues
# 5. Keep old version for quick rollback
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# API health
curl https://medio.example.com/api/health

# Frontend
curl -I https://medio.example.com

# Database connectivity
psql $DATABASE_URL -c "SELECT 1"
```

### 2. Functional Testing

- [ ] User registration and login
- [ ] Video playback
- [ ] NFC chip scanning
- [ ] Session tracking
- [ ] Parent dashboard access
- [ ] Kids mode functionality

### 3. Performance Testing

```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://medio.example.com/api/health

# Or use k6
k6 run load-test.js
```

### 4. Security Scan

```bash
# Check SSL
nmap --script ssl-enum-ciphers -p 443 medio.example.com

# Check headers
curl -I https://medio.example.com

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://medio.example.com
```

## Maintenance Procedures

### 1. Regular Updates

```bash
# Weekly: Security updates
sudo apt-get update && sudo apt-get upgrade

# Monthly: Dependency updates
npm audit
npm update

# Quarterly: Major version updates
npm outdated
```

### 2. Database Maintenance

```bash
# Weekly: Analyze and vacuum
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Monthly: Reindex
psql $DATABASE_URL -c "REINDEX DATABASE medio_production;"

# Quarterly: Full vacuum
psql $DATABASE_URL -c "VACUUM FULL;"
```

### 3. Log Rotation and Cleanup

```bash
# Check log sizes
du -sh /var/log/medio/*

# Force rotation if needed
logrotate -f /etc/logrotate.d/medio

# Clean old backups
find /var/backups/medio -name "*.gz" -mtime +30 -delete
```

### 4. Performance Monitoring

Regular checks:
- Response time trends
- Error rate changes
- Database query performance
- Memory and CPU usage
- Disk space availability

### 5. Incident Response

1. **Detection**: Monitoring alerts
2. **Assessment**: Determine severity
3. **Containment**: Isolate issue
4. **Resolution**: Fix and deploy
5. **Recovery**: Restore service
6. **Post-mortem**: Document lessons

## Emergency Procedures

### Rollback Process

```bash
# Quick rollback with Docker
docker-compose down
docker-compose up -d --build medio-previous-version

# Database rollback
node backend/src/scripts/restore-database.js --latest
```

### Emergency Contacts

Document and maintain:
- On-call rotation schedule
- Escalation procedures
- Vendor support contacts
- Critical stakeholder contacts

## Conclusion

This guide provides comprehensive instructions for deploying and maintaining the Medio video platform in production. Regular reviews and updates of these procedures ensure continued security, performance, and reliability.

For questions or issues, consult the documentation or contact the development team.