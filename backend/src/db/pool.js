const { Pool } = require('pg');
require('dotenv').config();

// Build connection configuration
const poolConfig = {
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'medio',
  user: process.env.DB_USER || 'medio',
  password: process.env.DB_PASSWORD || 'medio_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
if (process.env.DATABASE_URL) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  module.exports = pool;
} else {
  const pool = new Pool(poolConfig);
  module.exports = pool;
}