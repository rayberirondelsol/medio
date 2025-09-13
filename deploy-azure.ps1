# Azure App Service Deployment Script with Basic Auth
param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,

    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory=$true)]
    [string]$SubscriptionId,

    [Parameter(Mandatory=$true)]
    [string]$BasicAuthUsername,

    [Parameter(Mandatory=$true)]
    [SecureString]$BasicAuthPassword,

    [Parameter(Mandatory=$false)]
    [string]$Location = "East US",

    [Parameter(Mandatory=$false)]
    [string]$Sku = "F1"
)

# Set Azure subscription
Write-Host "Setting Azure subscription to $SubscriptionId"
az account set --subscription $SubscriptionId

# Create resource group if it doesn't exist
Write-Host "Creating resource group $ResourceGroupName in $Location"
az group create --name $ResourceGroupName --location $Location

# Deploy ARM template
Write-Host "Deploying Azure resources..."
$deployResult = az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file "azure-deploy.json" `
    --parameters appName=$AppName location=$Location sku=$Sku basicAuthUsername=$BasicAuthUsername basicAuthPassword=$BasicAuthPassword `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Error "ARM template deployment failed"
    exit 1
}

# Build the React application
Write-Host "Building React application..."
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}

# Create deployment package
Write-Host "Creating deployment package..."
$zipPath = "deployment.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

# Add build files to zip
Compress-Archive -Path "build\*", "web.config" -DestinationPath $zipPath

# Deploy to Azure App Service
Write-Host "Deploying to Azure App Service..."
az webapp deployment source config-zip --resource-group $ResourceGroupName --name $AppName --src $zipPath

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment failed"
    exit 1
}

# Configure basic authentication
Write-Host "Configuring basic authentication..."
$basicAuthPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($BasicAuthPassword))

# Set basic auth credentials as app settings
az webapp config appsettings set --resource-group $ResourceGroupName --name $AppName --settings `
    BASIC_AUTH_USERNAME=$BasicAuthUsername `
    BASIC_AUTH_PASSWORD=$basicAuthPasswordPlain

# Configure web.config for basic auth
az webapp config set --resource-group $ResourceGroupName --name $AppName --generic-configurations '{\"basicAuthCredentials\":{\"username\":\"'$BasicAuthUsername'\",\"password\":\"'$basicAuthPasswordPlain'\"}}'

# Get publish profile
Write-Host "Getting publish profile..."
$publishProfile = az webapp deployment list-publishing-profiles --resource-group $ResourceGroupName --name $AppName --xml
$publishProfile | Out-File -FilePath "$AppName.PublishSettings" -Encoding UTF8

Write-Host "Deployment completed successfully!"
Write-Host "App URL: https://$AppName.azurewebsites.net"
Write-Host "Publish profile saved to: $AppName.PublishSettings"
Write-Host "Basic Auth - Username: $BasicAuthUsername"

# Clean up
Remove-Item $zipPath -ErrorAction SilentlyContinue