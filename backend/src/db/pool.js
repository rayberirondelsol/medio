const { Pool } = require('pg');
require('dotenv').config();

// Build connection configuration with optimized pooling
const poolConfig = {
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'medio',
  user: process.env.DB_USER || 'medio',
  password: process.env.DB_PASSWORD || 'medio_password',
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
  console.error('Unexpected error on idle database client', err);
});

// Add connection monitoring in development
if (process.env.NODE_ENV === 'development') {
  pool.on('connect', () => {
    console.log('Database pool: new client connected');
  });
  
  pool.on('remove', () => {
    console.log('Database pool: client removed');
  });
}

// Export pool with monitoring methods
module.exports = pool;

// Export pool stats for monitoring
module.exports.getPoolStats = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount,
});