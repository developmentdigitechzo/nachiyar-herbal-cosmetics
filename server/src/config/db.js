/**
 * Nachiyar Herbals & Cosmetics
 * Resilient PostgreSQL Database Connection Pool
 *
 * Automatically configured via environment configuration.
 * Automatically bootstraps schema and default admin accounts on initial connection.
 * Resilient to missing configuration: keeps server alive and reports status via /api/health.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./environment');

let pool = null;
let isConnected = false;
let connectionError = null;
let schemaBootstrapped = false;

function initPool() {
  const db = config.database;

  if (!db.isConfigured) {
    const envFile = config.isProduction ? '.env.production' : '.env.development';
    connectionError = `Database not configured. Please set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME in ${envFile} or cPanel environment variables.`;
    console.warn(`⚠️ [DatabaseConfig] ${connectionError}`);
    return null;
  }

  try {
    let poolConfig;
    if (db.connectionString) {
      poolConfig = {
        connectionString: db.connectionString,
        ssl: db.ssl,
        max: config.isProduction ? 20 : 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      };
    } else {
      poolConfig = {
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

    const newPool = new Pool(poolConfig);

    newPool.on('connect', () => {
      isConnected = true;
      connectionError = null;
    });

    newPool.on('error', (err) => {
      console.error('❌ Unexpected error on PostgreSQL client:', err.message);
      connectionError = err.message;
    });

    return newPool;
  } catch (err) {
    console.error('❌ Failed to construct database pool:', err.message);
    connectionError = err.message;
    return null;
  }
}

pool = initPool();

/**
 * Automatically bootstrap tables and default accounts from schema.sql
 */
async function autoBootstrapSchema() {
  if (schemaBootstrapped || !pool) return;
  try {
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      schemaBootstrapped = true;
      console.log('✅ PostgreSQL database schema & essential accounts verified/bootstrapped successfully.');
    }
  } catch (err) {
    console.warn('⚠️ Auto-schema bootstrap note:', err.message);
  }
}

// Trigger initial health check and schema bootstrap asynchronously
if (pool) {
  pool.query('SELECT NOW()')
    .then(() => {
      isConnected = true;
      connectionError = null;
      return autoBootstrapSchema();
    })
    .catch((err) => {
      isConnected = false;
      connectionError = err.message;
      console.warn('⚠️ Initial database ping failed:', err.message);
    });
}

/**
 * Resilient query wrapper that provides actionable errors instead of crashing
 */
async function query(text, params) {
  if (!pool) {
    // Attempt lazy re-initialization if environment variables were updated at runtime
    pool = initPool();
    if (!pool) {
      throw new Error(connectionError || 'Database not configured. Please set DATABASE_URL in cPanel environment variables.');
    }
  }

  try {
    return await pool.query(text, params);
  } catch (err) {
    // If table doesn't exist, try auto-bootstrap and retry once
    if (err.message && err.message.includes('does not exist')) {
      console.log('🔄 Detected missing relation, attempting auto-bootstrap of schema...');
      await autoBootstrapSchema();
      return await pool.query(text, params);
    }
    throw err;
  }
}

module.exports = {
  pool,
  query,
  isConnected: () => isConnected,
  getConnectionError: () => connectionError,
  autoBootstrapSchema
};
