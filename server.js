/**
 * Nachiyar Herbals & Cosmetics
 * Root Application Entrypoint
 */

const config = require('./server/src/config/environment');
const app = require('./server/src/app');
const { pool } = require('./server/src/config/db');
const storageService = require('./server/src/services/storage');

const PORT = config.port;

// Test DB connection before listening
if (pool && typeof pool.query === 'function') {
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error(`❌ [${config.env.toUpperCase()}] PostgreSQL connection failed:`, err.message);
    } else {
      console.log(`✅ [${config.env.toUpperCase()}] PostgreSQL connected successfully at:`, res.rows[0].now);
    }
  });
}

const server = app.listen(PORT, () => {
  console.log(`==================================================================`);
  console.log(`🌿 NACHIYAR HERBALS & COSMETICS`);
  console.log(`🚀 Modern Stack: Express.js + Node.js + PostgreSQL`);
  console.log(`🌍 Environment:   ${config.env.toUpperCase()}`);
  console.log(`🗄️ Database:      ${config.database.host || 'PostgreSQL Connection'} (SSL: ${Boolean(config.database.ssl)})`);
  console.log(`📁 File Storage:  ${storageService.getStorageType().toUpperCase()} (${storageService.getStorageDirectory()})`);
  console.log(`🛍️ Storefront:    http://localhost:${PORT}`);
  console.log(`💼 Nimda Console: http://localhost:${PORT}/nimda/`);
  console.log(`==================================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️ Port ${PORT} is already in use by another process.`);
  } else {
    console.error('Server error:', err);
  }
});

module.exports = server;
