#!/bin/bash

# Azure App Service Deployment Script with Basic Auth

set -e

# Function to display usage
usage() {
    echo "Usage: $0 -a APP_NAME -g RESOURCE_GROUP -s SUBSCRIPTION_ID -u USERNAME -p PASSWORD [-l LOCATION] [-k SKU]"
    echo ""
    echo "  -a APP_NAME           Azure App Service name"
    echo "  -g RESOURCE_GROUP     Azure resource group name"
    echo "  -s SUBSCRIPTION_ID    Azure subscription ID"
    echo "  -u USERNAME           Basic auth username"
    echo "  -p PASSWORD           Basic auth password"
    echo "  -l LOCATION           Azure location (default: eastus)"
    echo "  -k SKU                App Service plan SKU (default: F1)"
    echo ""
    exit 1
}

# Default values
LOCATION="eastus"
SKU="F1"

# Parse command line arguments
while getopts "a:g:s:u:p:l:k:h" opt; do
    case $opt in
        a) APP_NAME="$OPTARG" ;;
        g) RESOURCE_GROUP="$OPTARG" ;;
        s) SUBSCRIPTION_ID="$OPTARG" ;;
        u) BASIC_AUTH_USERNAME="$OPTARG" ;;
        p) BASIC_AUTH_PASSWORD="$OPTARG" ;;
        l) LOCATION="$OPTARG" ;;
        k) SKU="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

# Validate required parameters
if [[ -z "$APP_NAME" || -z "$RESOURCE_GROUP" || -z "$SUBSCRIPTION_ID" || -z "$BASIC_AUTH_USERNAME" || -z "$BASIC_AUTH_PASSWORD" ]]; then
    echo "Error: Missing required parameters"
    usage
fi

echo "Starting Azure deployment..."
echo "App Name: $APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "Subscription: $SUBSCRIPTION_ID"
echo "Location: $LOCATION"
echo "SKU: $SKU"

# Set Azure subscription
echo "Setting Azure subscription to $SUBSCRIPTION_ID"
az account set --subscription "$SUBSCRIPTION_ID"

# Create resource group if it doesn't exist
echo "Creating resource group $RESOURCE_GROUP in $LOCATION"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

# Deploy ARM template
echo "Deploying Azure resources..."
az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "azure-deploy.json" \
    --parameters appName="$APP_NAME" location="$LOCATION" sku="$SKU" basicAuthUsername="$BASIC_AUTH_USERNAME" basicAuthPassword="$BASIC_AUTH_PASSWORD"

# Build the React application
echo "Building React application..."
npm run build

# Create deployment package
echo "Creating deployment package..."
ZIP_PATH="deployment.zip"
rm -f "$ZIP_PATH"

# Create zip with build files and web.config
cd build
zip -r "../$ZIP_PATH" .
cd ..
zip "$ZIP_PATH" web.config

# Deploy to Azure App Service
echo "Deploying to Azure App Service..."
az webapp deployment source config-zip \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --src "$ZIP_PATH"

# Configure basic authentication app settings
echo "Configuring basic authentication..."
az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --settings BASIC_AUTH_USERNAME="$BASIC_AUTH_USERNAME" BASIC_AUTH_PASSWORD="$BASIC_AUTH_PASSWORD"

# Get publish profile
echo "Getting publish profile..."
az webapp deployment list-publishing-profiles \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --xml > "$APP_NAME.PublishSettings"

echo ""
echo "Deployment completed successfully!"
echo "App URL: https://$APP_NAME.azurewebsites.net"
echo "Publish profile saved to: $APP_NAME.PublishSettings"
echo "Basic Auth - Username: $BASIC_AUTH_USERNAME"

# Clean up
rm -f "$ZIP_PATH"

echo "Done!"