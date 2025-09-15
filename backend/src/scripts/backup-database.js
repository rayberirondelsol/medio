#!/usr/bin/env node

/**
 * Database Backup Script for Medio Platform
 * 
 * This script performs automated database backups with the following features:
 * - Creates timestamped SQL dumps
 * - Compresses backups with gzip
 * - Optionally uploads to S3
 * - Manages backup retention
 * - Sends notifications on success/failure
 * 
 * Usage:
 *   node backup-database.js [--upload-s3] [--retention-days=30]
 *   
 * Schedule with cron for automated backups:
 *   0 2 * * * /usr/bin/node /path/to/backup-database.js --upload-s3
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const zlib = require('zlib');
require('dotenv').config();

const exec = promisify(require('child_process').exec);
const gzip = promisify(zlib.gzip);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const config = {
  // Database connection
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: process.env.DB_PORT || 5432,
  dbName: process.env.DB_NAME || 'medio',
  dbUser: process.env.DB_USER || 'medio',
  dbPassword: process.env.DB_PASSWORD,
  
  // Backup settings
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../../../backups'),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  
  // S3 settings (optional)
  s3Bucket: process.env.BACKUP_S3_BUCKET,
  s3Region: process.env.BACKUP_S3_REGION || 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

// Parse command line arguments
const args = process.argv.slice(2);
const uploadToS3 = args.includes('--upload-s3');
const customRetention = args.find(arg => arg.startsWith('--retention-days='));
if (customRetention) {
  config.retentionDays = parseInt(customRetention.split('=')[1], 10);
}

/**
 * Create backup directory if it doesn't exist
 */
async function ensureBackupDir() {
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    console.log(`Created backup directory: ${config.backupDir}`);
  }
}

/**
 * Generate backup filename with timestamp
 */
function getBackupFilename() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `medio-backup-${timestamp}.sql`;
}

/**
 * Create database backup using pg_dump
 */
async function createBackup() {
  console.log('Starting database backup...');
  
  const filename = getBackupFilename();
  const filepath = path.join(config.backupDir, filename);
  
  // Build pg_dump command
  const pgDumpCommand = [
    'pg_dump',
    `-h ${config.dbHost}`,
    `-p ${config.dbPort}`,
    `-U ${config.dbUser}`,
    `-d ${config.dbName}`,
    '--no-password',
    '--verbose',
    '--format=plain',
    '--no-owner',
    '--no-privileges',
    '--no-tablespaces',
    '--no-unlogged-table-data',
    `-f ${filepath}`
  ].join(' ');
  
  // Set PGPASSWORD environment variable
  const env = { ...process.env, PGPASSWORD: config.dbPassword };
  
  try {
    const { stdout, stderr } = await exec(pgDumpCommand, { env });
    if (stderr && !stderr.includes('dumping contents')) {
      console.warn('pg_dump warnings:', stderr);
    }
    console.log(`Backup created: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
}

/**
 * Compress backup file
 */
async function compressBackup(filepath) {
  console.log('Compressing backup...');
  
  const compressedPath = `${filepath}.gz`;
  const fileContent = await readFile(filepath);
  const compressed = await gzip(fileContent, { level: 9 });
  
  await writeFile(compressedPath, compressed);
  await unlink(filepath); // Remove uncompressed file
  
  const stats = await stat(compressedPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`Backup compressed: ${compressedPath} (${sizeMB} MB)`);
  
  return compressedPath;
}

/**
 * Upload backup to S3
 */
async function uploadToS3Bucket(filepath) {
  if (!config.s3Bucket) {
    console.log('S3 bucket not configured, skipping upload');
    return;
  }
  
  console.log(`Uploading to S3 bucket: ${config.s3Bucket}...`);
  
  try {
    // Check if AWS CLI is available
    await exec('which aws');
    
    const filename = path.basename(filepath);
    const s3Path = `s3://${config.s3Bucket}/database-backups/${filename}`;
    
    const awsCommand = [
      'aws s3 cp',
      filepath,
      s3Path,
      `--region ${config.s3Region}`,
      '--storage-class STANDARD_IA',  // Use infrequent access for cost savings
    ];
    
    if (config.awsAccessKeyId && config.awsSecretAccessKey) {
      // AWS credentials will be set via environment if not using IAM roles
    }
    
    const { stdout, stderr } = await exec(awsCommand.join(' '));
    if (stderr) {
      console.warn('AWS CLI warnings:', stderr);
    }
    console.log(`Backup uploaded to S3: ${s3Path}`);
  } catch (error) {
    if (error.message.includes('which aws')) {
      console.warn('AWS CLI not installed, skipping S3 upload');
    } else {
      console.error('Failed to upload to S3:', error);
      throw error;
    }
  }
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups() {
  console.log(`Cleaning up backups older than ${config.retentionDays} days...`);
  
  const files = await readdir(config.backupDir);
  const now = Date.now();
  const maxAge = config.retentionDays * 24 * 60 * 60 * 1000;
  
  let deletedCount = 0;
  
  for (const file of files) {
    if (!file.startsWith('medio-backup-') || !file.endsWith('.gz')) {
      continue;
    }
    
    const filepath = path.join(config.backupDir, file);
    const stats = await stat(filepath);
    const age = now - stats.mtime.getTime();
    
    if (age > maxAge) {
      await unlink(filepath);
      console.log(`Deleted old backup: ${file}`);
      deletedCount++;
    }
  }
  
  console.log(`Cleanup complete. Deleted ${deletedCount} old backups.`);
}

/**
 * Send notification (can be extended to send emails or Slack messages)
 */
function sendNotification(success, message) {
  const status = success ? 'SUCCESS' : 'FAILURE';
  const timestamp = new Date().toISOString();
  
  // Log to console (in production, this could send to monitoring service)
  console.log(`[${timestamp}] Backup ${status}: ${message}`);
  
  // If Sentry is configured, send event
  if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    
    if (success) {
      Sentry.captureMessage(`Database backup successful: ${message}`, 'info');
    } else {
      Sentry.captureException(new Error(`Database backup failed: ${message}`));
    }
  }
}

/**
 * Main backup process
 */
async function performBackup() {
  const startTime = Date.now();
  
  try {
    // Ensure backup directory exists
    await ensureBackupDir();
    
    // Create database backup
    const backupPath = await createBackup();
    
    // Compress backup
    const compressedPath = await compressBackup(backupPath);
    
    // Upload to S3 if requested
    if (uploadToS3) {
      await uploadToS3Bucket(compressedPath);
    }
    
    // Clean up old backups
    await cleanupOldBackups();
    
    // Calculate duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const message = `Backup completed in ${duration}s: ${path.basename(compressedPath)}`;
    
    sendNotification(true, message);
    process.exit(0);
  } catch (error) {
    const message = `Backup failed: ${error.message}`;
    sendNotification(false, message);
    console.error(error);
    process.exit(1);
  }
}

// Check if pg_dump is available
exec('which pg_dump')
  .then(() => {
    // Run backup
    performBackup();
  })
  .catch(() => {
    console.error('ERROR: pg_dump not found. Please install PostgreSQL client tools.');
    console.error('Ubuntu/Debian: sudo apt-get install postgresql-client');
    console.error('Mac: brew install postgresql');
    process.exit(1);
  });