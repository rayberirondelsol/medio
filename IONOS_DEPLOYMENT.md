# IONOS Deployment Guide

This guide explains how to deploy the React application to IONOS hosting.

## Prerequisites

1. An IONOS hosting account with:
   - Web hosting package (Basic or higher)
   - SSH/SFTP access enabled
   - A domain configured

2. GitHub repository with Actions enabled

## Required Repository Secrets

You need to configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `IONOS_SFTP_USERNAME` | Your IONOS SFTP/SSH username | `u123456789` |
| `IONOS_SFTP_HOST` | IONOS SFTP server hostname | `access.ionos.com` or `ssh.ionos.com` |
| `IONOS_SFTP_PORT` | SFTP port (usually 22) | `22` |
| `IONOS_SSH_PRIVATE_KEY` | Your SSH private key for authentication | `-----BEGIN RSA PRIVATE KEY-----...` |
| `IONOS_REMOTE_PATH` | Remote directory path on IONOS server | `/public_html` or `/httpdocs` |
| `IONOS_DOMAIN` | Your domain name | `example.com` |

## Setting Up SSH Key Authentication

1. Generate an SSH key pair (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
   ```

2. Add the public key to IONOS:
   - Log in to your IONOS account
   - Go to `Hosting > SSH Access`
   - Add your public key (contents of `~/.ssh/id_rsa.pub`)

3. Add the private key to GitHub Secrets:
   - Copy the entire private key including headers
   - Add it as `IONOS_SSH_PRIVATE_KEY` secret

## Deployment Process

The deployment is automated through GitHub Actions:

1. Push to `main` or `master` branch triggers deployment
2. The workflow:
   - Builds the React application
   - Runs tests
   - Deploys via SFTP to IONOS
   - Uploads `.htaccess` for proper routing

## Manual Deployment

You can also trigger deployment manually:

1. Go to `Actions` tab in your GitHub repository
2. Select `Deploy to IONOS` workflow
3. Click `Run workflow`

## Environment Configuration

Edit `ionos.config.json` to customize:
- Environment-specific settings
- Domain configurations
- Remote paths
- Basic authentication settings

## Apache Configuration

The `.htaccess` file handles:
- React Router support (SPA routing)
- HTTPS redirection
- Security headers
- Gzip compression
- Cache control

## Troubleshooting

### SFTP Connection Issues
- Verify your IONOS account has SSH/SFTP enabled
- Check that the SSH key is correctly formatted
- Ensure the SFTP host and port are correct

### Deployment Path Issues
- Verify the remote path exists on your IONOS server
- Common paths: `/public_html`, `/httpdocs`, or `/www`
- Check folder permissions (should be 755)

### React Router Not Working
- Ensure `.htaccess` is deployed correctly
- Verify Apache mod_rewrite is enabled
- Check that the RewriteBase is set correctly

## Basic Authentication Setup

### Enabling Password Protection

For development and staging environments, you can enable basic authentication:

1. **Generate .htpasswd file**:
   ```bash
   # Install htpasswd if not available
   # On Ubuntu/Debian: apt-get install apache2-utils
   # On macOS: Already included
   
   # Create password for a user
   htpasswd -c .htpasswd username
   ```

2. **Configure in ionos.config.json**:
   ```json
   "staging": {
     "basicAuth": {
       "enabled": true,
       "username": "staging-admin"
     }
   }
   ```

3. **Add to .htaccess** (automatically handled by deployment script):
   ```apache
   # Basic Authentication
   AuthType Basic
   AuthName "Restricted Access"
   AuthUserFile /path/to/.htpasswd
   Require valid-user
   ```

4. **Deploy .htpasswd**:
   - Place .htpasswd in project root
   - Deployment script will upload it automatically when basicAuth is enabled

### Security Notes
- Never commit .htpasswd to version control
- Add `.htpasswd` to `.gitignore`
- Use strong passwords
- Rotate credentials regularly

## Rollback Mechanism

### Automatic Backup

The deployment script creates automatic backups before each deployment:

1. **Backup Location**: `backup/` directory on the server
2. **Previous Backup**: Saved as `backup.old/`

### Manual Rollback Process

If you need to rollback to the previous deployment:

1. **Connect to IONOS via SSH**:
   ```bash
   ssh -p 22 -i ~/.ssh/ionos_key username@access.ionos.com
   ```

2. **Navigate to your web directory**:
   ```bash
   cd /public_html  # or your configured remote path
   ```

3. **Restore from backup**:
   ```bash
   # Remove current deployment
   rm -rf !(backup|backup.old)
   
   # Restore from backup
   cp -r backup/* .
   
   # Or restore from older backup
   cp -r backup.old/* .
   ```

### Rollback Script

Create `rollback-ionos.sh` for automated rollback:

```bash
#!/bin/bash

# Rollback to previous deployment
ENV=${1:-production}
source .env.ionos

ssh -p 22 -i "$IONOS_SSH_KEY_PATH" "$IONOS_SFTP_USERNAME@$IONOS_SFTP_HOST" <<EOF
cd $REMOTE_PATH
if [ -d "backup" ]; then
    rm -rf current_failed
    mv !(backup|backup.old) current_failed
    cp -r backup/* .
    echo "Rollback completed successfully"
else
    echo "No backup available for rollback"
    exit 1
fi
EOF
```

## Monitoring Setup

### Uptime Monitoring

1. **IONOS Monitoring** (if available in your package):
   - Log into IONOS Control Panel
   - Navigate to Hosting > Monitoring
   - Enable website monitoring
   - Set check interval and alert preferences

2. **External Monitoring Services**:

   **UptimeRobot** (Free tier available):
   ```bash
   # Add monitor via API
   curl -X POST https://api.uptimerobot.com/v2/newMonitor \
     -d "api_key=YOUR_API_KEY" \
     -d "friendly_name=IONOS Production" \
     -d "url=https://your-domain.com" \
     -d "type=1"
   ```

   **Better Uptime**:
   - Add your domain
   - Configure check frequency
   - Set up alerts (email, SMS, Slack)

3. **GitHub Actions Status Check**:
   
   Add to your workflow:
   ```yaml
   - name: Health Check After Deployment
     run: |
       for i in {1..5}; do
         if curl -f https://${{ secrets.IONOS_DOMAIN }}; then
           echo "Site is up!"
           exit 0
         fi
         echo "Attempt $i failed, waiting..."
         sleep 10
       done
       exit 1
   ```

### Performance Monitoring

1. **Google Lighthouse CI**:
   ```yaml
   - name: Run Lighthouse CI
     uses: treosh/lighthouse-ci-action@v9
     with:
       urls: https://${{ secrets.IONOS_DOMAIN }}
       uploadArtifacts: true
   ```

2. **Custom Health Endpoint**:
   
   Create `public/health.json`:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "timestamp": "BUILD_TIMESTAMP"
   }
   ```

   Monitor with:
   ```bash
   curl https://your-domain.com/health.json
   ```

### Log Monitoring

1. **Access IONOS Logs**:
   ```bash
   ssh -p 22 -i ~/.ssh/ionos_key username@access.ionos.com
   cd /logs
   tail -f access.log
   tail -f error.log
   ```

2. **Download Logs for Analysis**:
   ```bash
   sftp -P 22 -i ~/.ssh/ionos_key username@access.ionos.com <<EOF
   cd /logs
   get access.log
   get error.log
   bye
   EOF
   ```

3. **Automated Log Alerts**:
   
   Create `check-errors.sh`:
   ```bash
   #!/bin/bash
   ERROR_COUNT=$(ssh ... "grep -c 'ERROR' /logs/error.log")
   if [ $ERROR_COUNT -gt 0 ]; then
     # Send alert
     curl -X POST https://hooks.slack.com/... \
       -d '{"text":"Errors detected in IONOS logs!"}'
   fi
   ```

### Deployment Notifications

Add to deployment script:
```bash
# Slack notification
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"Deployment to $ENV completed successfully!\"}"
```

## Testing

Run deployment tests:

```bash
# Run all tests
./tests/run-deployment-tests.sh

# Run tests for specific environment
./tests/run-deployment-tests.sh staging

# Include live deployment checks
./tests/run-deployment-tests.sh production --live
```

Test coverage includes:
- Configuration validation
- IONOS connectivity
- Post-deployment health checks
- React Router functionality
- SSL/HTTPS redirect validation
- Basic authentication (if enabled)

## Support

For IONOS-specific issues:
- IONOS Support: https://www.ionos.com/help
- IONOS Community: https://www.ionos.com/community

For deployment workflow issues:
- Check GitHub Actions logs
- Review repository secrets configuration
- Ensure all required secrets are set
- Run deployment tests locally