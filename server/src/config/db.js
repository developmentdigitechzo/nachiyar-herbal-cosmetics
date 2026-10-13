/**
 * Nachiyar Herbals & Cosmetics
 * PostgreSQL Database Connection Pool
 *
 * Automatically configured via environment configuration:
 * - Local Development: connects to local PostgreSQL instance
 * - Production: connects to production PostgreSQL instance (with SSL enabled)
 *
 * Zero hardcoded credentials. Credentials are loaded from .env.development or .env.production.
 */

const { Pool } = require('pg');
const config = require('./environment');

function createPoolConfig() {
  const db = config.database;

  // Option 1: Full Connection URI
  if (db.connectionString) {
    return {
      connectionString: db.connectionString,
      ssl: db.ssl,
      max: config.isProduction ? 20 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };
  }

  // Option 2: Discrete credentials
  if (db.host && db.database) {
    return {
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
      ssl: db.ssl,
      max: config.isProduction ? 20 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };
  }

  // Fallback: throw informative error if not configured
  const envFile = config.isProduction ? '.env.production' : '.env.development';
  throw new Error(
    `[DatabaseConfig] Missing database configuration for ${config.env} environment. ` +
    `Please set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in ${envFile} or environment variables.`
  );
}

const poolConfig = createPoolConfig();
const pool = new Pool(poolConfig);

pool.on('connect', () => {
  // Connected successfully
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
