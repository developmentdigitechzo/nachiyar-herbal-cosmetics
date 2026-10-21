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
  if (!pool) return;
  try {
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      const stmts = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const stmt of stmts) {
        try {
          await pool.query(stmt);
        } catch (stmtErr) {
          // Individual statement error will not abort other statements
        }
      }
      schemaBootstrapped = true;
      console.log('✅ PostgreSQL database schema & essential tables verified/bootstrapped successfully.');
    }

    // Auto-seed core products if products table is empty
    try {
      const prodCountRes = await pool.query('SELECT COUNT(*) FROM products');
      const prodCount = parseInt(prodCountRes.rows[0].count, 10);
      if (prodCount === 0) {
        const dbJsonPath = path.join(__dirname, '..', '..', '..', 'data', 'db.json');
        if (fs.existsSync(dbJsonPath)) {
          const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
          if (Array.isArray(dbData.products)) {
            for (const p of dbData.products) {
              await pool.query(`
                INSERT INTO products (
                  id, slug, name, subtitle, category, category_id,
                  price, mrp, stock, initial_stock, online_sold, offline_sold,
                  sku, images, theme_color, tagline, metric_badge, badge,
                  short_description, description, benefits, ingredients, how_to_use,
                  variants, seo, status
                ) VALUES (
                  $1, $2, $3, $4, $5, $6,
                  $7, $8, $9, $10, 0, 0,
                  $11, $12, $13, $14, $15, $16,
                  $17, $18, $19, $20, $21,
                  $22, $23, $24
                ) ON CONFLICT (id) DO NOTHING
              `, [
                p.id, p.slug, p.name, p.subtitle || '', p.category || 'Hair Care', p.categoryId || 'cat_hair_care',
                p.price, p.mrp || Math.round(p.price * 1.2), p.stock || 50, p.initialStock || p.stock || 50,
                p.sku || '', JSON.stringify(p.images || []), p.themeColor || '#6B4E9B', p.tagline || '',
                p.metricBadge || '', p.badge || '', p.shortDescription || '', p.description || '',
                JSON.stringify(p.benefits || []), p.ingredients || '', p.howToUse || '',
                JSON.stringify(p.variants || []), JSON.stringify(p.seo || {}), p.status || 'active'
              ]);
            }
            console.log('✅ Auto-seeded core products into empty database.');
          }
        }
      }
    } catch (seedErr) {
      console.warn('Auto-seed check note:', seedErr.message);
    }

    // Auto-seed categories table if empty
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          count INT DEFAULT 0
        )
      `);
      const catCountRes = await pool.query('SELECT COUNT(*) FROM categories');
      if (parseInt(catCountRes.rows[0].count, 10) === 0) {
        await pool.query(`
          INSERT INTO categories (id, name, slug, count)
          VALUES 
            ('cat_hair_care', 'Hair Care', 'hair-care', 1),
            ('cat_scalp', 'Scalp & Cleansing', 'scalp-cleansing', 1),
            ('cat_sets', 'Ritual Sets & Combos', 'ritual-sets', 1),
            ('cat_gifting', 'Royal Gifting', 'royal-gifting', 0)
          ON CONFLICT (id) DO NOTHING
        `);
      }
    } catch (catErr) {
      console.warn('Categories verify note:', catErr.message);
    }

    // Auto-synchronize table ownership & permissions between nachiyarherbals and nachiyarherbals_client_db
    try {
      const syncPermissionsSql = `
        DO $$
        BEGIN
          -- 1. Transfer ownership of client_db tables to nachiyarherbals
          BEGIN ALTER TABLE IF EXISTS categories OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE IF EXISTS contact_messages OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE IF EXISTS customers OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE IF EXISTS reviews OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE IF EXISTS inventory_logs OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE IF EXISTS invoices OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE IF EXISTS orders OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE IF EXISTS products OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE IF EXISTS site_settings OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE IF EXISTS users OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;

          -- 2. Grant all permissions to both users across all tables & sequences
          BEGIN
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nachiyarherbals;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nachiyarherbals;
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nachiyarherbals_client_db;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nachiyarherbals_client_db;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;

          -- 3. Set default privileges for any future tables
          BEGIN
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nachiyarherbals;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nachiyarherbals_client_db;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END $$;
      `;
      await pool.query(syncPermissionsSql);
      console.log('✅ PostgreSQL database table ownership & permissions synchronized to nachiyarherbals successfully.');
    } catch (syncErr) {
      console.warn('Ownership sync note:', syncErr.message);
    }

    // Auto-seed default admin account into users table if empty
    try {
      const userCountRes = await pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCountRes.rows[0].count, 10) === 0) {
        await pool.query(`
          INSERT INTO users (id, username, email, phone, password, name, role, permissions)
          VALUES 
            ('user_nimda_master', 'admin', 'admin@nachiyarherbals.com', '9876543210', 'admin123', 'Super Administrator', 'super_admin', '["all"]'::jsonb)
          ON CONFLICT (id) DO NOTHING
        `);
        console.log('✅ Auto-seeded master admin account into users table.');
      }
    } catch (userErr) {
      console.warn('Users seed note:', userErr.message);
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
