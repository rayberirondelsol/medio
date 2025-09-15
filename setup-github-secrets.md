# GitHub Secrets Setup for Fly.io Deployment

This guide walks you through setting up the required GitHub secrets for automated Fly.io deployment.

## Required Secret

You need to configure one secret in your GitHub repository:

### FLY_API_TOKEN
This is your Fly.io API token that allows GitHub Actions to deploy to your Fly.io app.

## Setup Steps

### Step 1: Generate Fly.io Deploy Token

1. Install Fly CLI if you haven't already:
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex

   # macOS
   brew install flyctl

   # Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. Login to Fly.io:
   ```bash
   fly auth login
   ```

3. Generate a deploy token:
   ```bash
   fly tokens create deploy -x 999999h
   ```

   **Important**: Copy the entire output including the "FlyV1 " prefix!

### Step 2: Add Secret to GitHub Repository

1. Navigate to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Set the following:
   - **Name**: `FLY_API_TOKEN`
   - **Value**: The token from Step 1 (including "FlyV1 " prefix)
6. Click **Add secret**

## Visual Guide

### GitHub Repository Settings
```
Repository → Settings → Secrets and variables → Actions
```

### Secret Configuration
```
Name: FLY_API_TOKEN
Value: FlyV1 fm2_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Verification

After adding the secret, you can verify it's set correctly by:

1. Going to **Settings** → **Secrets and variables** → **Actions**
2. You should see `FLY_API_TOKEN` listed under "Repository secrets"
3. The value will be hidden for security

## Testing the Setup

Once the secret is configured:

1. Make any small change to your code
2. Commit and push to the `feature/fly-io-deployment` branch
3. Go to the **Actions** tab in your repository
4. You should see the "Deploy to Fly.io" workflow running
5. The deployment should complete successfully if everything is configured correctly

## Troubleshooting

### Common Issues

1. **Token format error**
   - Ensure you copied the complete token including "FlyV1 " prefix
   - There should be no extra spaces or newlines

2. **Authentication failed**
   - Verify you're logged in to the correct Fly.io account
   - Check that the token has the correct permissions

3. **Secret not found**
   - Verify the secret name is exactly `FLY_API_TOKEN` (case-sensitive)
   - Ensure you added it to the correct repository

### Regenerating Token

If you need to regenerate the token:

```bash
# Generate a new token
fly tokens create deploy -x 999999h

# Update the GitHub secret with the new value
```

## Security Best Practices

1. **Token Expiration**: The token is set to expire in 999999 hours (~114 years). Consider setting a shorter expiration for better security
2. **Scope**: This is a deploy token with limited permissions - it can only deploy, not manage your Fly.io account
3. **Repository Access**: Only add the secret to repositories that need it
4. **Regular Rotation**: Consider rotating tokens periodically

## Next Steps

After setting up the secret:

1. **Test Deployment**: Push a change to trigger the workflow
2. **Monitor Logs**: Check the Actions tab for deployment logs
3. **Verify App**: Visit your app URL to confirm it's working
4. **Set Up Monitoring**: Consider adding monitoring and alerting

## Additional Resources

- [Fly.io Deploy Tokens Documentation](https://fly.io/docs/reference/deploy-tokens/)
- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Fly.io Continuous Deployment Guide](https://fly.io/docs/launch/continuous-deployment-with-github-actions/)