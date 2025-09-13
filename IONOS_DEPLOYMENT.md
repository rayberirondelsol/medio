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

## Support

For IONOS-specific issues:
- IONOS Support: https://www.ionos.com/help
- IONOS Community: https://www.ionos.com/community

For deployment workflow issues:
- Check GitHub Actions logs
- Review repository secrets configuration
- Ensure all required secrets are set