# Fly.io Deployment Guide

This guide explains how to deploy the React application to Fly.io hosting using automated CI/CD.

## Prerequisites

1. A Fly.io account (sign up at https://fly.io/app/sign-up)
2. GitHub repository with Actions enabled
3. Flyctl CLI installed locally (for initial setup)

## Quick Setup

### 1. Install Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

### 2. Login to Fly.io

```bash
fly auth login
```

### 3. Create Fly.io App (Run Once)

```bash
# From your project root
fly launch --no-deploy

# Follow the prompts:
# - Choose app name (or let it generate one)
# - Choose region (e.g., iad for US East)
# - Don't deploy yet (we'll set up CI/CD first)
```

### 4. Generate Deploy Token

```bash
fly tokens create deploy -x 999999h
```

Copy the entire output including "FlyV1 " prefix.

### 5. Configure GitHub Secrets

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Create a new repository secret:
   - Name: `FLY_API_TOKEN`
   - Value: The token from step 4 (including "FlyV1 " prefix)

### 6. Deploy

Push your changes to trigger the first deployment:

```bash
git add .
git commit -m "Add Fly.io deployment configuration"
git push origin feature/fly-io-deployment
```

## Configuration Files

### fly.toml
Main configuration file for Fly.io deployment:
- App name and region settings
- HTTP service configuration with health checks
- Environment variables
- Static file serving configuration

### Dockerfile
Multi-stage build configuration:
- Stage 1: Build React app with Node.js
- Stage 2: Serve with nginx on port 8080
- Security hardening with non-root user

### nginx.conf
Nginx configuration optimized for React SPA:
- Client-side routing support
- Security headers
- Gzip compression
- Static asset caching

### .github/workflows/fly.yml
GitHub Actions workflow for automated deployment:
- Triggered on push to main branches
- Runs tests before deployment
- Uses Fly.io's official GitHub Action
- Includes health check after deployment

## Environment Configuration

### Production Settings
```toml
[env]
  NODE_ENV = "production"
```

### Custom Environment Variables
Add to your fly.toml file:
```toml
[env]
  REACT_APP_API_URL = "https://api.yourapp.com"
  REACT_APP_VERSION = "1.0.0"
```

Or set them via CLI:
```bash
fly secrets set REACT_APP_API_URL=https://api.yourapp.com
```

## Scaling and Performance

### Auto-scaling Configuration
The app is configured to auto-start and auto-stop machines based on traffic:

```toml
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
```

### Manual Scaling
```bash
# Scale to 2 instances
fly scale count 2

# Scale machine resources
fly scale vm shared-cpu-1x --memory 512

# Scale to specific regions
fly scale count 2 --region iad,lhr
```

## Monitoring and Logs

### View Application Logs
```bash
fly logs
```

### Monitor Application Status
```bash
fly status
```

### Access Metrics
```bash
fly dashboard
```

### Health Checks
The app includes HTTP health checks:
- Path: `/`
- Interval: 15 seconds
- Timeout: 10 seconds
- Grace period: 5 seconds

## Custom Domains

### Add Custom Domain
```bash
fly certs create yourdomain.com
fly certs create www.yourdomain.com
```

### DNS Configuration
Add these DNS records:
- A record: `@` → `[your-app-ip]`
- CNAME record: `www` → `[your-app-name].fly.dev`

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all dependencies are in package.json
   - Ensure npm test passes locally
   - Verify Node.js version compatibility

2. **Deployment Token Issues**
   - Ensure token includes "FlyV1 " prefix
   - Check token hasn't expired
   - Verify secret name is exactly `FLY_API_TOKEN`

3. **Port Configuration**
   - App must listen on port 8080 (configured in nginx.conf)
   - Internal port in fly.toml matches container port

4. **Static File Serving**
   - React Router requires try_files configuration
   - Check nginx.conf for proper fallback to index.html

### Debugging Commands

```bash
# Connect to running instance
fly ssh console

# Check nginx status
fly ssh console -C "ps aux | grep nginx"

# View nginx logs
fly ssh console -C "tail -n 50 /var/log/nginx/error.log"

# Test local build
docker build -t medio-test .
docker run -p 8080:8080 medio-test
```

## Security

### Security Headers
Nginx is configured with security headers:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Non-root Container
The container runs as the nginx user for security.

### HTTPS Only
Force HTTPS is enabled in fly.toml:
```toml
[http_service]
  force_https = true
```

## Cost Optimization

### Free Tier Limits
- 3 shared-cpu-1x machines
- 160GB/month outbound data transfer
- Auto-stop when not in use

### Cost Management
```bash
# View current usage
fly billing show

# Set spending limits (via dashboard)
fly dashboard --open
```

## Backup and Recovery

### Backup Strategies
Since this is a static React app, backup focuses on:
1. Source code in Git repository
2. Build artifacts (reproducible from source)
3. Configuration files

### Recovery Process
1. Restore from Git repository
2. Re-run deployment pipeline
3. Verify application functionality

## Support and Resources

- **Fly.io Documentation**: https://fly.io/docs/
- **GitHub Actions Integration**: https://fly.io/docs/launch/continuous-deployment-with-github-actions/
- **Community Support**: https://community.fly.io/
- **Status Page**: https://status.fly.io/

## Next Steps

1. Set up monitoring and alerting
2. Configure custom domain
3. Implement staging environment
4. Add performance monitoring
5. Set up log aggregation