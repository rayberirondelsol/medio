#!/usr/bin/env node

/**
 * Database Restore Script for Medio Platform
 * 
 * This script restores database backups with the following features:
 * - Restores from local or S3 backups
 * - Handles compressed backups
 * - Creates backup of current database before restore
 * - Validates restore success
 * 
 * Usage:
 *   node restore-database.js <backup-file>
 *   node restore-database.js --from-s3 <s3-key>
 *   node restore-database.js --latest
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const zlib = require('zlib');
require('dotenv').config();

const exec = promisify(require('child_process').exec);
const gunzip = promisify(zlib.gunzip);
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
  
  // S3 settings (optional)
  s3Bucket: process.env.BACKUP_S3_BUCKET,
  s3Region: process.env.BACKUP_S3_REGION || 'us-east-1',
};

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(`
Database Restore Script

Usage:
  node restore-database.js <backup-file>          Restore from local file
  node restore-database.js --from-s3 <s3-key>     Restore from S3
  node restore-database.js --latest               Restore latest local backup
  node restore-database.js --list                 List available backups

Examples:
  node restore-database.js backups/medio-backup-2024-01-01.sql.gz
  node restore-database.js --from-s3 database-backups/medio-backup-2024-01-01.sql.gz
  node restore-database.js --latest
  `);
  process.exit(0);
}

/**
 * List available backups
 */
async function listBackups() {
  console.log('Available local backups:');
  
  if (!fs.existsSync(config.backupDir)) {
    console.log('No backup directory found');
    return;
  }
  
  const files = await readdir(config.backupDir);
  const backups = files
    .filter(f => f.startsWith('medio-backup-') && f.endsWith('.gz'))
    .sort()
    .reverse();
  
  if (backups.length === 0) {
    console.log('No backups found');
    return;
  }
  
  for (const backup of backups) {
    const filepath = path.join(config.backupDir, backup);
    const stats = await stat(filepath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const date = stats.mtime.toISOString();
    console.log(`  - ${backup} (${sizeMB} MB, ${date})`);
  }
}

/**
 * Get latest backup file
 */
async function getLatestBackup() {
  if (!fs.existsSync(config.backupDir)) {
    throw new Error('No backup directory found');
  }
  
  const files = await readdir(config.backupDir);
  const backups = files
    .filter(f => f.startsWith('medio-backup-') && f.endsWith('.gz'))
    .sort()
    .reverse();
  
  if (backups.length === 0) {
    throw new Error('No backups found');
  }
  
  return path.join(config.backupDir, backups[0]);
}

/**
 * Download backup from S3
 */
async function downloadFromS3(s3Key) {
  if (!config.s3Bucket) {
    throw new Error('S3 bucket not configured');
  }
  
  console.log(`Downloading from S3: ${s3Key}...`);
  
  const localPath = path.join(config.backupDir, path.basename(s3Key));
  const s3Path = `s3://${config.s3Bucket}/${s3Key}`;
  
  const awsCommand = [
    'aws s3 cp',
    s3Path,
    localPath,
    `--region ${config.s3Region}`,
  ].join(' ');
  
  const { stdout, stderr } = await exec(awsCommand);
  if (stderr && !stderr.includes('download')) {
    console.warn('AWS CLI warnings:', stderr);
  }
  
  console.log(`Downloaded to: ${localPath}`);
  return localPath;
}

/**
 * Decompress backup file
 */
async function decompressBackup(compressedPath) {
  console.log('Decompressing backup...');
  
  const decompressedPath = compressedPath.replace('.gz', '');
  const compressed = await readFile(compressedPath);
  const decompressed = await gunzip(compressed);
  
  await writeFile(decompressedPath, decompressed);
  console.log(`Backup decompressed: ${decompressedPath}`);
  
  return decompressedPath;
}

/**
 * Create backup of current database before restore
 */
async function backupCurrentDatabase() {
  console.log('Creating backup of current database before restore...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `medio-pre-restore-${timestamp}.sql`;
  const filepath = path.join(config.backupDir, filename);
  
  const pgDumpCommand = [
    'pg_dump',
    `-h ${config.dbHost}`,
    `-p ${config.dbPort}`,
    `-U ${config.dbUser}`,
    `-d ${config.dbName}`,
    '--no-password',
    '--format=plain',
    '--no-owner',
    '--no-privileges',
    `-f ${filepath}`
  ].join(' ');
  
  const env = { ...process.env, PGPASSWORD: config.dbPassword };
  
  try {
    await exec(pgDumpCommand, { env });
    console.log(`Current database backed up to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('Failed to backup current database:', error);
    throw error;
  }
}

/**
 * Restore database from backup file
 */
async function restoreDatabase(backupPath) {
  console.log(`Restoring database from: ${backupPath}...`);
  
  // Build psql command
  const psqlCommand = [
    'psql',
    `-h ${config.dbHost}`,
    `-p ${config.dbPort}`,
    `-U ${config.dbUser}`,
    `-d ${config.dbName}`,
    '--no-password',
    '--set', 'ON_ERROR_STOP=on',
    '-f', backupPath
  ].join(' ');
  
  const env = { ...process.env, PGPASSWORD: config.dbPassword };
  
  try {
    const { stdout, stderr } = await exec(psqlCommand, { env, maxBuffer: 1024 * 1024 * 10 });
    if (stderr) {
      console.warn('psql warnings:', stderr);
    }
    console.log('Database restored successfully');
  } catch (error) {
    console.error('Failed to restore database:', error);
    throw error;
  }
}

/**
 * Validate restored database
 */
async function validateRestore() {
  console.log('Validating restored database...');
  
  const pool = require('../../db/pool');
  
  try {
    // Check basic connectivity
    const result = await pool.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public']);
    const tableCount = result.rows[0].table_count;
    console.log(`Database has ${tableCount} tables`);
    
    // Check core tables exist
    const coreTables = ['users', 'profiles', 'videos', 'watch_sessions', 'nfc_chips'];
    for (const table of coreTables) {
      const exists = await pool.query(
        'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)',
        [table]
      );
      if (!exists.rows[0].exists) {
        throw new Error(`Core table missing: ${table}`);
      }
    }
    
    console.log('Database validation passed');
    await pool.end();
  } catch (error) {
    console.error('Database validation failed:', error);
    await pool.end();
    throw error;
  }
}

/**
 * Main restore process
 */
async function performRestore() {
  const startTime = Date.now();
  
  try {
    let backupPath;
    
    // Determine backup source
    if (args.includes('--list')) {
      await listBackups();
      process.exit(0);
    } else if (args.includes('--latest')) {
      backupPath = await getLatestBackup();
      console.log(`Using latest backup: ${backupPath}`);
    } else if (args.includes('--from-s3')) {
      const s3Index = args.indexOf('--from-s3');
      if (s3Index === -1 || !args[s3Index + 1]) {
        throw new Error('S3 key not provided');
      }
      const s3Key = args[s3Index + 1];
      backupPath = await downloadFromS3(s3Key);
    } else {
      backupPath = args[0];
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
    }
    
    // Decompress if needed
    let sqlPath = backupPath;
    if (backupPath.endsWith('.gz')) {
      sqlPath = await decompressBackup(backupPath);
    }
    
    // Backup current database
    await backupCurrentDatabase();
    
    // Restore database
    await restoreDatabase(sqlPath);
    
    // Clean up decompressed file if it was created
    if (sqlPath !== backupPath) {
      await unlink(sqlPath);
    }
    
    // Validate restore
    await validateRestore();
    
    // Calculate duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Restore completed successfully in ${duration}s`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Check if psql is available
exec('which psql')
  .then(() => {
    // Run restore
    performRestore();
  })
  .catch(() => {
    console.error('ERROR: psql not found. Please install PostgreSQL client tools.');
    console.error('Ubuntu/Debian: sudo apt-get install postgresql-client');
    console.error('Mac: brew install postgresql');
    process.exit(1);
  });