# Azure App Service Deployment Guide

This guide explains how to deploy your React application to Azure App Service with basic authentication and publish profile configuration.

## Prerequisites

- Azure CLI installed and configured
- Azure subscription
- Node.js and npm installed
- Git repository (for GitHub Actions deployment)

## Files Overview

### Configuration Files

- `web.config` - IIS configuration for Azure App Service
- `azure-deploy.json` - ARM template for Azure resources
- `sample.PublishSettings` - Example publish profile format

### Deployment Scripts

- `deploy-azure.ps1` - PowerShell deployment script
- `deploy-azure.sh` - Bash deployment script (cross-platform)
- `.github/workflows/azure-deploy.yml` - GitHub Actions workflow

## Manual Deployment

### Using PowerShell (Windows)

```powershell
.\deploy-azure.ps1 `
  -AppName "your-app-name" `
  -ResourceGroupName "your-resource-group" `
  -SubscriptionId "your-subscription-id" `
  -BasicAuthUsername "admin" `
  -BasicAuthPassword (ConvertTo-SecureString "your-password" -AsPlainText -Force) `
  -Location "East US" `
  -Sku "B1"
```

### Using Bash (Linux/macOS/WSL)

```bash
./deploy-azure.sh \
  -a "your-app-name" \
  -g "your-resource-group" \
  -s "your-subscription-id" \
  -u "admin" \
  -p "your-password" \
  -l "eastus" \
  -k "B1"
```

## GitHub Actions Deployment

### Setup Required Secrets

In your GitHub repository, go to Settings > Secrets and variables > Actions, and add:

1. `AZURE_CREDENTIALS` - Azure service principal credentials (JSON format):
   ```json
   {
     "clientId": "your-client-id",
     "clientSecret": "your-client-secret",
     "subscriptionId": "your-subscription-id",
     "tenantId": "your-tenant-id"
   }
   ```

2. `AZURE_RESOURCE_GROUP` - Your Azure resource group name
3. `BASIC_AUTH_USERNAME` - Basic authentication username
4. `BASIC_AUTH_PASSWORD` - Basic authentication password

### Creating Azure Service Principal

```bash
az ad sp create-for-rbac --name "your-app-github-actions" --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
  --sdk-auth
```

### Update Workflow Configuration

Edit `.github/workflows/azure-deploy.yml` and update:
- `AZURE_WEBAPP_NAME` - Your Azure App Service name

## Basic Authentication Configuration

The deployment automatically configures basic authentication using:

1. **Web.config** - IIS-level authentication configuration
2. **App Settings** - Azure App Service environment variables
3. **ARM Template** - Azure resource-level authentication

### Testing Basic Auth

After deployment, access your app at `https://your-app-name.azurewebsites.net`. You'll be prompted for credentials:
- Username: As configured in deployment
- Password: As configured in deployment

## Publish Profile

The deployment scripts automatically generate and save a publish profile to:
- `{AppName}.PublishSettings` (local deployment)
- GitHub Actions artifact (automated deployment)

### Using Publish Profile in Visual Studio

1. Right-click your project in Visual Studio
2. Select "Publish"
3. Choose "Import Profile"
4. Select the generated `.PublishSettings` file

## SSL/TLS Configuration

The deployment automatically configures:
- HTTPS Only: Enabled
- Minimum TLS Version: 1.2
- Security headers in web.config

## App Service Plan SKUs

Available SKUs for different needs:

- **F1** (Free) - Limited resources, good for testing
- **B1** (Basic) - Low cost, suitable for development
- **S1** (Standard) - Production workloads, custom domains
- **P1V2** (Premium) - High performance, scaling

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Ensure `npm run build` works locally
   - Check Node.js version compatibility

2. **Deployment Fails**
   - Verify Azure CLI authentication
   - Check resource group permissions
   - Ensure app name is unique globally

3. **Basic Auth Not Working**
   - Check web.config syntax
   - Verify app settings are configured
   - Clear browser cache

4. **404 Errors on Refresh**
   - Ensure web.config is deployed
   - Check URL rewrite rules

### Useful Commands

```bash
# Check app status
az webapp show --resource-group your-rg --name your-app --query state

# View app logs
az webapp log tail --resource-group your-rg --name your-app

# Restart app
az webapp restart --resource-group your-rg --name your-app

# Get publish profile
az webapp deployment list-publishing-profiles --resource-group your-rg --name your-app --xml
```

## Security Considerations

- Store sensitive information in Azure Key Vault
- Use managed identities when possible
- Regularly rotate basic auth credentials
- Monitor access logs
- Consider Azure Active Directory integration for production

## Cost Optimization

- Use F1 tier for development/testing
- Scale down during off-hours
- Monitor usage with Azure Cost Management
- Consider Azure Functions for serverless deployment

## Next Steps

1. Configure custom domain
2. Set up SSL certificate
3. Configure monitoring and alerts
4. Implement CI/CD pipeline improvements
5. Add staging slots for blue-green deployments