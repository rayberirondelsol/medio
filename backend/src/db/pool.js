const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../utils/logger');

// Validate required database environment variables
if (!process.env.DATABASE_URL) {
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    logger.error('ERROR: Database configuration missing. Please set either DATABASE_URL or DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD environment variables.');
    process.exit(1);
  }
}

// Build connection configuration with optimized pooling
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Connection pool optimization
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),  // Minimum pool size
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),  // Maximum pool size (reduced from 20 for better resource management)
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10),  // Close idle clients after 30s
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),  // Increased timeout for production
  // Performance optimizations
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),  // Kill queries after 30s
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '30000', 10),
  // Keep-alive for long-running connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Enable SSL in production
if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    // Allow for custom CA certificate if provided
    ca: process.env.DB_SSL_CA || undefined,
  };
}

// Use connection string if provided (overrides individual settings)
let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.DB_SSL_CA || undefined,
    } : false,
    // Apply same optimized pool settings
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT_MS || '30000', 10),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
} else {
  pool = new Pool(poolConfig);
}

// Add error handling for pool
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle database client', err);
});

// Add connection monitoring in development
if (process.env.NODE_ENV === 'development') {
  pool.on('connect', () => {
    logger.debug('Database pool: new client connected');
  });
  
  pool.on('remove', () => {
    logger.debug('Database pool: client removed');
  });
}

// Retry logic for database queries
const retryQuery = async (query, params, maxRetries = 3, retryDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(query, params);
    } catch (error) {
      lastError = error;
      
      // Log retry attempt
      logger.warn(`Database query failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
      
      // Don't retry on certain errors
      if (error.code === '23505' || // unique violation
          error.code === '23503' || // foreign key violation
          error.code === '23502' || // not null violation
          error.code === '42P01' || // undefined table
          error.code === '42703') { // undefined column
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  
  logger.error(`Database query failed after ${maxRetries} attempts`, lastError);
  throw lastError;
};

// Export pool with monitoring methods
module.exports = pool;

// Export retry wrapper
module.exports.queryWithRetry = retryQuery;

// Export pool stats for monitoring
module.exports.getPoolStats = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount,
});