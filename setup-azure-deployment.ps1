# Azure Deployment Setup Script
# This script will guide you through setting up Azure deployment with all required secrets and configurations

param(
    [Parameter(Mandatory=$false)]
    [string]$AppBaseName = "medio-app",

    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",

    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",

    [Parameter(Mandatory=$false)]
    [string]$BasicAuthUsername = "admin"
)

Write-Host "=== Azure Deployment Setup ===" -ForegroundColor Green
Write-Host "This script will set up your Azure deployment environment" -ForegroundColor Yellow

# Generate unique names
$timestamp = Get-Date -Format "yyyyMMddHHmm"
$appName = "$AppBaseName-$Environment-$timestamp"
$resourceGroupName = "rg-$AppBaseName-$Environment"
$servicePrincipalName = "sp-$AppBaseName-github-actions"

Write-Host "`nConfiguration:" -ForegroundColor Cyan
Write-Host "  App Name: $appName"
Write-Host "  Resource Group: $resourceGroupName"
Write-Host "  Location: $Location"
Write-Host "  Service Principal: $servicePrincipalName"

# Check if Azure CLI is installed
try {
    az --version | Out-Null
    Write-Host "`n✓ Azure CLI is installed" -ForegroundColor Green
} catch {
    Write-Error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if user is logged in
Write-Host "`nChecking Azure login status..."
$loginCheck = az account show 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please log in to Azure:" -ForegroundColor Yellow
    az login
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Azure login failed"
        exit 1
    }
}

# Get subscription info
$subscription = az account show --query "{subscriptionId: id, tenantId: tenantId, name: name}" | ConvertFrom-Json
Write-Host "`n✓ Logged in to Azure" -ForegroundColor Green
Write-Host "  Subscription: $($subscription.name)" -ForegroundColor Gray
Write-Host "  Subscription ID: $($subscription.subscriptionId)" -ForegroundColor Gray
Write-Host "  Tenant ID: $($subscription.tenantId)" -ForegroundColor Gray

# Create resource group
Write-Host "`nCreating resource group..." -ForegroundColor Yellow
az group create --name $resourceGroupName --location $Location --output none
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Resource group '$resourceGroupName' created" -ForegroundColor Green
} else {
    Write-Error "Failed to create resource group"
    exit 1
}

# Create service principal for GitHub Actions
Write-Host "`nCreating service principal for GitHub Actions..." -ForegroundColor Yellow
$spOutput = az ad sp create-for-rbac --name $servicePrincipalName --role contributor --scopes "/subscriptions/$($subscription.subscriptionId)/resourceGroups/$resourceGroupName" --sdk-auth --only-show-errors
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Service principal created" -ForegroundColor Green
    $servicePrincipal = $spOutput | ConvertFrom-Json
} else {
    Write-Error "Failed to create service principal"
    exit 1
}

# Generate basic auth password
$basicAuthPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object {[char]$_})

# Create environment configuration file
$envConfig = @{
    appName = $appName
    resourceGroup = $resourceGroupName
    subscriptionId = $subscription.subscriptionId
    tenantId = $subscription.tenantId
    location = $Location
    basicAuth = @{
        username = $BasicAuthUsername
        password = $basicAuthPassword
    }
    servicePrincipal = @{
        clientId = $servicePrincipal.clientId
        clientSecret = $servicePrincipal.clientSecret
        subscriptionId = $servicePrincipal.subscriptionId
        tenantId = $servicePrincipal.tenantId
    }
    gitHub = @{
        secrets = @{
            AZURE_CREDENTIALS = ($spOutput | ConvertTo-Json -Compress)
            AZURE_RESOURCE_GROUP = $resourceGroupName
            BASIC_AUTH_USERNAME = $BasicAuthUsername
            BASIC_AUTH_PASSWORD = $basicAuthPassword
            AZURE_WEBAPP_NAME = $appName
        }
    }
}

$envConfigJson = $envConfig | ConvertTo-Json -Depth 10
$envConfigJson | Out-File -FilePath "azure-environment.json" -Encoding UTF8

Write-Host "`n=== CONFIGURATION SUMMARY ===" -ForegroundColor Green
Write-Host "App Name: $appName" -ForegroundColor White
Write-Host "Resource Group: $resourceGroupName" -ForegroundColor White
Write-Host "Basic Auth Username: $BasicAuthUsername" -ForegroundColor White
Write-Host "Basic Auth Password: $basicAuthPassword" -ForegroundColor White

Write-Host "`n=== GITHUB SECRETS ===" -ForegroundColor Cyan
Write-Host "Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):"
Write-Host ""
Write-Host "AZURE_CREDENTIALS:" -ForegroundColor Yellow
Write-Host $spOutput -ForegroundColor Gray
Write-Host ""
Write-Host "AZURE_RESOURCE_GROUP: $resourceGroupName" -ForegroundColor Yellow
Write-Host "BASIC_AUTH_USERNAME: $BasicAuthUsername" -ForegroundColor Yellow
Write-Host "BASIC_AUTH_PASSWORD: $basicAuthPassword" -ForegroundColor Yellow
Write-Host "AZURE_WEBAPP_NAME: $appName" -ForegroundColor Yellow

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Green
Write-Host "1. Add the GitHub secrets shown above to your repository"
Write-Host "2. Update .github/workflows/azure-deploy.yml with the app name"
Write-Host "3. Run the deployment: ./deploy-azure.ps1 -AppName $appName -ResourceGroupName $resourceGroupName -SubscriptionId $($subscription.subscriptionId) -BasicAuthUsername $BasicAuthUsername -BasicAuthPassword (ConvertTo-SecureString '$basicAuthPassword' -AsPlainText -Force)"
Write-Host "4. Test the deployment with Playwright"

Write-Host "`nConfiguration saved to: azure-environment.json" -ForegroundColor Cyan
Write-Host "Keep this file secure and do not commit it to version control!" -ForegroundColor Red