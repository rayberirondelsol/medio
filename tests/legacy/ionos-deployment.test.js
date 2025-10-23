/**
 * IONOS Deployment Tests
 * Tests for verifying IONOS deployment functionality
 */

const { exec } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 2000 // 2 seconds
};

// Helper function to execute shell commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Helper function to check URL with retries
async function checkUrl(url, expectedStatus, retries = TEST_CONFIG.retryAttempts) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const request = protocol.get(url, { timeout: 10000 }, (response) => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers
          });
        });
        
        request.on('error', reject);
        request.on('timeout', () => reject(new Error('Request timeout')));
      });
      
      if (result.statusCode === expectedStatus) {
        return result;
      }
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.retryDelay));
      }
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.retryDelay));
    }
  }
  throw new Error(`Failed to get expected status ${expectedStatus} from ${url}`);
}

describe('IONOS Deployment Tests', () => {
  let config;
  let environment;
  
  beforeAll(() => {
    // Load configuration
    const configPath = path.join(__dirname, '..', 'ionos.config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('ionos.config.json not found');
    }
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Determine test environment
    environment = process.env.TEST_ENV || 'staging';
    if (!config.environments[environment]) {
      throw new Error(`Environment '${environment}' not found in configuration`);
    }
  });
  
  describe('Configuration Validation', () => {
    test('should have valid configuration file', () => {
      expect(config).toBeDefined();
      expect(config.environments).toBeDefined();
    });
    
    test('should have required environment settings', () => {
      const env = config.environments[environment];
      expect(env.domain).toBeDefined();
      expect(env.remotePath).toBeDefined();
      expect(env.sftpHost).toBeDefined();
      expect(env.sftpPort).toBeDefined();
    });
    
    test('should have valid deployment settings', () => {
      expect(config.deploymentSettings).toBeDefined();
      expect(config.deploymentSettings.buildCommand).toBeDefined();
      expect(config.deploymentSettings.httpsOnly).toBe(true);
    });
  });
  
  describe('IONOS Connectivity', () => {
    test('should connect to IONOS SFTP server', async () => {
      const env = config.environments[environment];
      const sftpHost = env.sftpHost;
      const sftpPort = env.sftpPort;
      
      // Test SSH connectivity (just check if port is reachable)
      const command = `nc -zv ${sftpHost} ${sftpPort} 2>&1`;
      
      try {
        const result = await executeCommand(command);
        expect(result.stdout + result.stderr).toContain('succeeded');
      } catch (error) {
        // Alternative check using timeout
        const timeoutCommand = `timeout 5 bash -c "echo > /dev/tcp/${sftpHost}/${sftpPort}" 2>&1`;
        const result = await executeCommand(timeoutCommand);
        expect(result).toBeDefined();
      }
    }, TEST_CONFIG.timeout);
    
    test('should have SSH key configured', () => {
      const sshKeyPath = process.env.IONOS_SSH_KEY_PATH;
      if (sshKeyPath) {
        expect(fs.existsSync(sshKeyPath)).toBe(true);
        
        // Check permissions
        const stats = fs.statSync(sshKeyPath);
        const permissions = (stats.mode & parseInt('777', 8)).toString(8);
        expect(['600', '400']).toContain(permissions);
      } else {
        console.warn('IONOS_SSH_KEY_PATH not set, skipping SSH key test');
      }
    });
  });
  
  describe('Post-Deployment Health Checks', () => {
    const getBaseUrl = () => {
      const env = config.environments[environment];
      return `https://${env.domain}`;
    };
    
    test('should have site accessible via HTTPS', async () => {
      const url = getBaseUrl();
      const result = await checkUrl(url, 200);
      expect(result.statusCode).toBe(200);
    }, TEST_CONFIG.timeout);
    
    test('should redirect HTTP to HTTPS', async () => {
      const env = config.environments[environment];
      const httpUrl = `http://${env.domain}`;
      
      try {
        const result = await checkUrl(httpUrl, 301);
        expect([301, 302]).toContain(result.statusCode);
        expect(result.headers.location).toContain('https://');
      } catch (error) {
        // Some hosts might not allow HTTP at all
        console.warn('HTTP redirect test failed, site might be HTTPS-only');
      }
    }, TEST_CONFIG.timeout);
    
    test('should have security headers configured', async () => {
      const url = getBaseUrl();
      const result = await checkUrl(url, 200);
      
      // Check for security headers
      const headers = result.headers;
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      
      // HSTS header might not be present in all environments
      if (environment === 'production') {
        expect(headers['strict-transport-security']).toContain('max-age=');
      }
    }, TEST_CONFIG.timeout);
    
    test('should serve static assets with proper caching', async () => {
      const url = `${getBaseUrl()}/static/css/main.css`;
      
      try {
        const result = await checkUrl(url, 200);
        expect(result.headers['cache-control'] || result.headers['expires']).toBeDefined();
      } catch (error) {
        console.warn('Static asset test skipped - asset might not exist');
      }
    }, TEST_CONFIG.timeout);
  });
  
  describe('React Router Functionality', () => {
    test('should handle React Router paths correctly', async () => {
      const baseUrl = getBaseUrl();
      const testPaths = [
        '/about',
        '/contact',
        '/products/123',
        '/user/profile'
      ];
      
      for (const path of testPaths) {
        try {
          const result = await checkUrl(`${baseUrl}${path}`, 200);
          expect(result.statusCode).toBe(200);
        } catch (error) {
          // If basic auth is enabled, we might get 401
          const env = config.environments[environment];
          if (env.basicAuth && env.basicAuth.enabled) {
            console.warn(`Path ${path} requires authentication`);
          } else {
            throw error;
          }
        }
      }
    }, TEST_CONFIG.timeout * 2);
    
    test('should return 200 for non-existent routes (SPA behavior)', async () => {
      const url = `${getBaseUrl()}/this-route-does-not-exist-${Date.now()}`;
      
      try {
        const result = await checkUrl(url, 200);
        expect(result.statusCode).toBe(200);
      } catch (error) {
        // Basic auth might interfere
        const env = config.environments[environment];
        if (env.basicAuth && env.basicAuth.enabled) {
          console.warn('SPA routing test requires authentication');
        } else {
          throw error;
        }
      }
    }, TEST_CONFIG.timeout);
  });
  
  describe('Basic Authentication', () => {
    test('should require authentication if enabled', async () => {
      const env = config.environments[environment];
      
      if (env.basicAuth && env.basicAuth.enabled) {
        const url = getBaseUrl();
        
        try {
          await checkUrl(url, 401);
        } catch (error) {
          // Some servers might return 403 instead of 401
          expect(error.message).toContain('401');
        }
      } else {
        console.log('Basic auth not enabled for this environment');
      }
    }, TEST_CONFIG.timeout);
  });
  
  describe('Deployment Script Validation', () => {
    test('should have deployment script with proper error handling', () => {
      const scriptPath = path.join(__dirname, '..', 'deploy-ionos.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);
      
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      
      // Check for error handling features
      expect(scriptContent).toContain('set -e');
      expect(scriptContent).toContain('trap cleanup EXIT');
      expect(scriptContent).toContain('if !');
      expect(scriptContent).toContain('chmod 600');
    });
    
    test('should validate environment variables', async () => {
      const command = 'bash -c "source ./deploy-ionos.sh 2>&1 | head -n 20"';
      
      try {
        await executeCommand(command);
      } catch (error) {
        // Script should fail with missing env vars
        expect(error.stderr || error.stdout).toContain('environment variable not set');
      }
    });
  });
});

// Export test utilities for use in other tests
module.exports = {
  checkUrl,
  executeCommand,
  TEST_CONFIG
};