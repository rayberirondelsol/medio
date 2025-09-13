# Complete Azure Deployment Setup Guide

This guide will walk you through setting up Azure App Service deployment with basic authentication and Playwright testing.

## Step 1: Prerequisites

Make sure you have:
- [Azure CLI installed](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- [Node.js 18+](https://nodejs.org/)
- Azure subscription
- GitHub repository (for automated deployment)

## Step 2: Azure Login and Setup

1. **Log into Azure CLI:**
   ```bash
   az login
   ```

2. **Run the automated setup script:**
   ```bash
   # For Windows PowerShell
   .\setup-azure-deployment.ps1

   # For Linux/macOS/WSL
   ./setup-azure-deployment.sh

   # With custom parameters
   ./setup-azure-deployment.sh -n "my-medio-app" -e "production" -l "westus2" -u "admin"
   ```

   This script will:
   - Create Azure resource group
   - Create service principal for GitHub Actions
   - Generate basic auth credentials
   - Create configuration files
   - Display GitHub secrets to add

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets (values will be provided by the setup script):

- `AZURE_CREDENTIALS` - Service principal JSON
- `AZURE_RESOURCE_GROUP` - Resource group name
- `BASIC_AUTH_USERNAME` - Basic auth username
- `BASIC_AUTH_PASSWORD` - Basic auth password
- `AZURE_WEBAPP_NAME` - App service name

## Step 4: Manual Deployment (Optional)

If you prefer manual deployment:

```bash
# Using the generated configuration
source .env.azure

./deploy-azure.sh \
  -a "$AZURE_WEBAPP_NAME" \
  -g "$AZURE_RESOURCE_GROUP" \
  -s "$AZURE_SUBSCRIPTION_ID" \
  -u "$BASIC_AUTH_USERNAME" \
  -p "$BASIC_AUTH_PASSWORD"
```

## Step 5: Automated Deployment via GitHub Actions

Once secrets are configured:

1. Push to `main` or `master` branch
2. GitHub Actions will automatically:
   - Build the React app
   - Deploy to Azure App Service
   - Configure basic authentication
   - Generate publish profile

## Step 6: Test Deployment with Playwright

### Local Testing

1. **Update environment variables:**
   ```bash
   # The setup script creates .env.azure with your values
   cat .env.azure
   ```

2. **Run Playwright tests:**
   ```bash
   # Run all tests
   npm run test:e2e

   # Run tests with browser visible
   npm run test:e2e:headed

   # Debug mode
   npm run test:e2e:debug
   ```

### Using Playwright MCP

With the Playwright MCP server configured in Claude Code, you can run tests directly:

```javascript
// Test basic authentication
await page.goto('https://your-app.azurewebsites.net');
// Should prompt for authentication

// Test with credentials
await page.setExtraHTTPHeaders({
  'Authorization': `Basic ${Buffer.from('username:password').toString('base64')}`
});
await page.goto('https://your-app.azurewebsites.net');
// Should load successfully
```

## Step 7: Verify Deployment

### Manual Verification

1. **Visit your app:** `https://YOUR-APP-NAME.azurewebsites.net`
2. **Enter credentials** when prompted
3. **Verify React app loads** correctly

### Programmatic Verification

```bash
# Test basic auth endpoint
curl -u username:password https://your-app.azurewebsites.net

# Check security headers
curl -I https://your-app.azurewebsites.net
```

## Configuration Files

### Generated Files

- `azure-environment.json` - Complete configuration (⚠️ Contains secrets)
- `.env.azure` - Environment variables for local testing
- `YOUR-APP-NAME.PublishSettings` - Visual Studio publish profile

### Important Security Notes

- **Never commit** `azure-environment.json` to version control
- **Never commit** `.env.azure` to version control
- Store production secrets in Azure Key Vault
- Rotate basic auth credentials regularly

## Troubleshooting

### Common Issues

1. **Azure CLI not logged in**
   ```bash
   az login
   az account show
   ```

2. **Insufficient permissions**
   - Ensure you have Contributor role on subscription
   - Check resource group permissions

3. **App name already exists**
   - App names must be globally unique
   - Try a different name or add timestamp

4. **Build failures**
   ```bash
   npm run build
   # Check for TypeScript errors
   ```

5. **Authentication not working**
   - Check web.config deployment
   - Verify app settings in Azure portal
   - Clear browser cache

### Useful Commands

```bash
# Check app status
az webapp show --resource-group $RESOURCE_GROUP --name $APP_NAME --query state

# View app logs
az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME

# Restart app
az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME

# Update app settings
az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings KEY=VALUE
```

## Advanced Configuration

### Custom Domain

```bash
az webapp config hostname add --resource-group $RESOURCE_GROUP --webapp-name $APP_NAME --hostname yourdomain.com
```

### SSL Certificate

```bash
az webapp config ssl bind --resource-group $RESOURCE_GROUP --name $APP_NAME --certificate-thumbprint $THUMBPRINT --ssl-type SNI
```

### Scaling

```bash
az appservice plan update --resource-group $RESOURCE_GROUP --name $APP_SERVICE_PLAN --sku S1 --number-of-workers 2
```

## Next Steps

1. Set up monitoring and alerts
2. Configure custom domain and SSL
3. Implement staging slots
4. Set up Azure Application Insights
5. Configure automated backups
6. Implement infrastructure as code with Terraform/Bicep

## Support

- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Playwright Documentation](https://playwright.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)