#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { generateSecureSecret } = require('../utils/crypto');

console.log('🔐 Generating secure secrets for Medio platform...\n');

// Generate secrets
const jwtSecret = generateSecureSecret(32); // 256 bits
const cookieSecret = generateSecureSecret(32); // 256 bits
const dbPassword = generateSecureSecret(16); // 128 bits

console.log('Generated secrets (save these securely!):\n');
console.log('═══════════════════════════════════════════');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`COOKIE_SECRET=${cookieSecret}`);
console.log(`DB_PASSWORD=${dbPassword}`);
console.log('═══════════════════════════════════════════\n');

// Check if .env exists
const envPath = path.join(__dirname, '../../.env');
const envExamplePath = path.join(__dirname, '../../.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  
  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Replace placeholder values with generated secrets
    envContent = envContent.replace(
      'your_64_character_minimum_secure_jwt_secret_here_do_not_use_default',
      jwtSecret
    );
    envContent = envContent.replace(
      'your_secure_cookie_secret_here',
      cookieSecret
    );
    envContent = envContent.replace(
      'your_secure_password_here',
      dbPassword
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created with secure secrets!');
  } else {
    console.log('⚠️  .env.example not found. Please create .env manually with the secrets above.');
  }
} else {
  console.log('ℹ️  .env file already exists. Please update it manually with the secrets above.');
}

console.log('\n🔒 Security recommendations:');
console.log('   - Never commit .env files to version control');
console.log('   - Rotate secrets regularly in production');
console.log('   - Use a secure key management system for production');
console.log('   - Enable SSL for database connections in production');
console.log('   - Use environment-specific secrets (dev/staging/prod)');
console.log('\n✨ Done!');