# Complete IONOS Deployment Setup Guide

This guide will walk you through setting up IONOS deployment for your React application.

## Step 1: Prerequisites

Make sure you have:
- [Node.js 18+](https://nodejs.org/)
- IONOS hosting account with SSH/SFTP access
- GitHub repository (for automated deployment)
- SSH client installed

## Step 2: IONOS Account Setup

1. **Log into IONOS Control Panel:**
   - Visit [IONOS Login](https://login.ionos.com/)
   - Navigate to your hosting package

2. **Enable SSH/SFTP Access:**
   - Go to `Hosting` → `SSH Access`
   - Enable SSH if not already active
   - Note your SSH username and host

3. **Set Up SSH Key Authentication:**
   ```bash
   # Generate SSH key pair if you don't have one
   ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
   
   # Display your public key
   cat ~/.ssh/id_rsa.pub
   ```
   
   - Add the public key to IONOS:
     - Go to `Hosting` → `SSH Access` → `SSH Keys`
     - Add your public key

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Description | How to Find |
|------------|-------------|-------------|
| `IONOS_SFTP_USERNAME` | Your IONOS username | IONOS Control Panel → Hosting → Access Data |
| `IONOS_SFTP_HOST` | SFTP server hostname | Usually `access.ionos.com` or `ssh.ionos.com` |
| `IONOS_SFTP_PORT` | SFTP port | Usually `22` |
| `IONOS_SSH_PRIVATE_KEY` | Your SSH private key | Content of `~/.ssh/id_rsa` |
| `IONOS_REMOTE_PATH` | Remote directory | Usually `/public_html` or `/httpdocs` |
| `IONOS_DOMAIN` | Your domain | Your website domain |

### Adding SSH Private Key to GitHub:

```bash
# Copy your private key (including headers)
cat ~/.ssh/id_rsa

# Add the entire content as IONOS_SSH_PRIVATE_KEY secret
```

## Step 4: Manual Deployment (Optional)

If you prefer manual deployment:

```bash
# Set environment variables
export IONOS_SFTP_USERNAME="your-username"
export IONOS_SSH_KEY_PATH="~/.ssh/id_rsa"

# Run deployment script
./deploy-ionos.sh production
```

## Step 5: Automated Deployment via GitHub Actions

Once secrets are configured:

1. Push to `main` or `master` branch
2. GitHub Actions will automatically:
   - Build the React app
   - Run tests
   - Deploy to IONOS via SFTP
   - Configure Apache with .htaccess

## Step 6: Verify Deployment

### Manual Verification

1. **Visit your app:** `https://your-domain.com`
2. **Verify React app loads correctly**
3. **Test React Router** by navigating to different routes

### Check Deployment Files

```bash
# SSH into your IONOS server
ssh -p 22 your-username@access.ionos.com

# Check deployed files
ls -la ~/public_html/
cat ~/public_html/.htaccess
```

### Test with cURL

```bash
# Test HTTPS redirect
curl -I http://your-domain.com

# Test main page
curl -I https://your-domain.com

# Check security headers
curl -I https://your-domain.com | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport"
```

## Configuration Files

### Project Files

- `ionos.config.json` - IONOS deployment configuration
- `.htaccess` - Apache server configuration
- `.github/workflows/ionos-deploy.yml` - GitHub Actions workflow

### Environment Configuration

Edit `ionos.config.json` to customize:

```json
{
  "environments": {
    "production": {
      "domain": "your-domain.com",
      "remotePath": "/public_html",
      "sftpHost": "access.ionos.com",
      "sftpPort": 22
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **SFTP Connection Failed**
   ```bash
   # Test SSH connection
   ssh -p 22 -i ~/.ssh/id_rsa your-username@access.ionos.com
   
   # Check SSH key permissions
   chmod 600 ~/.ssh/id_rsa
   chmod 644 ~/.ssh/id_rsa.pub
   ```

2. **404 Errors on React Routes**
   - Ensure `.htaccess` is deployed
   - Check Apache mod_rewrite is enabled
   - Verify RewriteBase in .htaccess

3. **Permission Denied**
   ```bash
   # Fix folder permissions on IONOS
   ssh your-username@access.ionos.com
   chmod 755 ~/public_html
   chmod 644 ~/public_html/.htaccess
   ```

4. **Build Failures**
   ```bash
   # Test build locally
   npm ci
   npm run build
   npm test
   ```

### IONOS-Specific Commands

```bash
# Connect to IONOS via SSH
ssh -p 22 your-username@access.ionos.com

# Check disk usage
df -h

# View error logs
tail -f ~/logs/error.log

# Check PHP version (if needed for API)
php -v

# View Apache modules
apachectl -M 2>/dev/null || httpd -M
```

## Advanced Configuration

### Custom Domain Setup

1. **In IONOS Control Panel:**
   - Go to `Domains & SSL`
   - Add your domain
   - Configure DNS records

2. **SSL Certificate:**
   - IONOS provides free SSL certificates
   - Enable in `Domains & SSL` → `SSL Certificates`
   - Usually auto-configured

### Performance Optimization

1. **Enable Caching:**
   - Already configured in `.htaccess`
   - Adjust cache times as needed

2. **Enable Compression:**
   - Gzip compression configured in `.htaccess`
   - Verify with: `curl -H "Accept-Encoding: gzip" -I https://your-domain.com`

### Basic Authentication (Optional)

To add basic authentication:

1. **Create .htpasswd file:**
   ```bash
   htpasswd -c .htpasswd username
   ```

2. **Update .htaccess:**
   ```apache
   AuthType Basic
   AuthName "Restricted Access"
   AuthUserFile /path/to/.htpasswd
   Require valid-user
   ```

## Monitoring

### Set Up Monitoring

1. **Uptime Monitoring:**
   - Use services like UptimeRobot or Pingdom
   - Monitor `https://your-domain.com`

2. **GitHub Actions Status:**
   - Check Actions tab in GitHub
   - Set up email notifications for failures

3. **IONOS Analytics:**
   - Available in IONOS Control Panel
   - View traffic, errors, and usage

## Migration from Azure

If migrating from Azure:

1. **Export data** if needed
2. **Update DNS** records to point to IONOS
3. **Test thoroughly** before switching
4. **Keep Azure active** during transition period

## Next Steps

1. Set up staging environment
2. Configure CDN for static assets
3. Implement automated backups
4. Set up error monitoring (e.g., Sentry)
5. Configure CI/CD for multiple environments

## Support

- [IONOS Help Center](https://www.ionos.com/help)
- [IONOS Community](https://www.ionos.com/community)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Apache Documentation](https://httpd.apache.org/docs/)