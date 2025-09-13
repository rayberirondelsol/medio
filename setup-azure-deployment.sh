#!/bin/bash

# Azure Deployment Setup Script
# This script will guide you through setting up Azure deployment with all required secrets and configurations

set -e

# Default values
APP_BASE_NAME="medio-app"
ENVIRONMENT="dev"
LOCATION="eastus"
BASIC_AUTH_USERNAME="admin"

# Function to display usage
usage() {
    echo "Usage: $0 [-n APP_BASE_NAME] [-e ENVIRONMENT] [-l LOCATION] [-u USERNAME]"
    echo ""
    echo "  -n APP_BASE_NAME      Base name for the app (default: medio-app)"
    echo "  -e ENVIRONMENT        Environment (default: dev)"
    echo "  -l LOCATION           Azure location (default: eastus)"
    echo "  -u USERNAME           Basic auth username (default: admin)"
    echo ""
    exit 1
}

# Parse command line arguments
while getopts "n:e:l:u:h" opt; do
    case $opt in
        n) APP_BASE_NAME="$OPTARG" ;;
        e) ENVIRONMENT="$OPTARG" ;;
        l) LOCATION="$OPTARG" ;;
        u) BASIC_AUTH_USERNAME="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

echo "=== Azure Deployment Setup ==="
echo "This script will set up your Azure deployment environment"

# Generate unique names
TIMESTAMP=$(date +%Y%m%d%H%M)
APP_NAME="${APP_BASE_NAME}-${ENVIRONMENT}-${TIMESTAMP}"
RESOURCE_GROUP_NAME="rg-${APP_BASE_NAME}-${ENVIRONMENT}"
SERVICE_PRINCIPAL_NAME="sp-${APP_BASE_NAME}-github-actions"

echo ""
echo "Configuration:"
echo "  App Name: $APP_NAME"
echo "  Resource Group: $RESOURCE_GROUP_NAME"
echo "  Location: $LOCATION"
echo "  Service Principal: $SERVICE_PRINCIPAL_NAME"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi
echo "✓ Azure CLI is installed"

# Check if user is logged in
echo ""
echo "Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo "Please log in to Azure:"
    az login
fi

# Get subscription info
SUBSCRIPTION_INFO=$(az account show --query "{subscriptionId: id, tenantId: tenantId, name: name}" -o json)
SUBSCRIPTION_ID=$(echo $SUBSCRIPTION_INFO | jq -r '.subscriptionId')
TENANT_ID=$(echo $SUBSCRIPTION_INFO | jq -r '.tenantId')
SUBSCRIPTION_NAME=$(echo $SUBSCRIPTION_INFO | jq -r '.name')

echo "✓ Logged in to Azure"
echo "  Subscription: $SUBSCRIPTION_NAME"
echo "  Subscription ID: $SUBSCRIPTION_ID"
echo "  Tenant ID: $TENANT_ID"

# Create resource group
echo ""
echo "Creating resource group..."
az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION" --output none
echo "✓ Resource group '$RESOURCE_GROUP_NAME' created"

# Create service principal for GitHub Actions
echo ""
echo "Creating service principal for GitHub Actions..."
SP_OUTPUT=$(az ad sp create-for-rbac --name "$SERVICE_PRINCIPAL_NAME" --role contributor --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP_NAME" --sdk-auth --only-show-errors)
echo "✓ Service principal created"

# Extract service principal details
CLIENT_ID=$(echo $SP_OUTPUT | jq -r '.clientId')
CLIENT_SECRET=$(echo $SP_OUTPUT | jq -r '.clientSecret')

# Generate basic auth password
BASIC_AUTH_PASSWORD=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)

# Create environment configuration file
cat > azure-environment.json << EOF
{
  "appName": "$APP_NAME",
  "resourceGroup": "$RESOURCE_GROUP_NAME",
  "subscriptionId": "$SUBSCRIPTION_ID",
  "tenantId": "$TENANT_ID",
  "location": "$LOCATION",
  "basicAuth": {
    "username": "$BASIC_AUTH_USERNAME",
    "password": "$BASIC_AUTH_PASSWORD"
  },
  "servicePrincipal": {
    "clientId": "$CLIENT_ID",
    "clientSecret": "$CLIENT_SECRET",
    "subscriptionId": "$SUBSCRIPTION_ID",
    "tenantId": "$TENANT_ID"
  },
  "gitHub": {
    "secrets": {
      "AZURE_CREDENTIALS": $(echo $SP_OUTPUT | jq -c .),
      "AZURE_RESOURCE_GROUP": "$RESOURCE_GROUP_NAME",
      "BASIC_AUTH_USERNAME": "$BASIC_AUTH_USERNAME",
      "BASIC_AUTH_PASSWORD": "$BASIC_AUTH_PASSWORD",
      "AZURE_WEBAPP_NAME": "$APP_NAME"
    }
  }
}
EOF

echo ""
echo "=== CONFIGURATION SUMMARY ==="
echo "App Name: $APP_NAME"
echo "Resource Group: $RESOURCE_GROUP_NAME"
echo "Basic Auth Username: $BASIC_AUTH_USERNAME"
echo "Basic Auth Password: $BASIC_AUTH_PASSWORD"

echo ""
echo "=== GITHUB SECRETS ==="
echo "Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):"
echo ""
echo "AZURE_CREDENTIALS:"
echo "$SP_OUTPUT"
echo ""
echo "AZURE_RESOURCE_GROUP: $RESOURCE_GROUP_NAME"
echo "BASIC_AUTH_USERNAME: $BASIC_AUTH_USERNAME"
echo "BASIC_AUTH_PASSWORD: $BASIC_AUTH_PASSWORD"
echo "AZURE_WEBAPP_NAME: $APP_NAME"

echo ""
echo "=== NEXT STEPS ==="
echo "1. Add the GitHub secrets shown above to your repository"
echo "2. Update .github/workflows/azure-deploy.yml with the app name"
echo "3. Run the deployment:"
echo "   ./deploy-azure.sh -a $APP_NAME -g $RESOURCE_GROUP_NAME -s $SUBSCRIPTION_ID -u $BASIC_AUTH_USERNAME -p $BASIC_AUTH_PASSWORD"
echo "4. Test the deployment with Playwright"

echo ""
echo "Configuration saved to: azure-environment.json"
echo "⚠️  Keep this file secure and do not commit it to version control!"

# Create .env file for local testing
cat > .env.azure << EOF
AZURE_WEBAPP_NAME=$APP_NAME
AZURE_RESOURCE_GROUP=$RESOURCE_GROUP_NAME
AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
BASIC_AUTH_USERNAME=$BASIC_AUTH_USERNAME
BASIC_AUTH_PASSWORD=$BASIC_AUTH_PASSWORD
APP_URL=https://$APP_NAME.azurewebsites.net
EOF

echo "Local environment file created: .env.azure"