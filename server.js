require('dotenv').config({ path: require('path').join(__dirname, 'server', '.env') });
const path = require('path');
const app = require('./server/src/app');
const { pool } = require('./server/src/config/db');

const PORT = process.env.PORT || 3000;

// Test DB connection before listening
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Could not connect to PostgreSQL:', err.message);
  } else {
    console.log('✅ PostgreSQL connected successfully at:', res.rows[0].now);
  }
});

const server = app.listen(PORT, () => {
  console.log(`==================================================================`);
  console.log(`🌿 NACHIYAR HERBALS & COSMETICS`);
  console.log(`🚀 Modern Stack: Express.js + Node.js + PostgreSQL`);
  console.log(`🛍️ Customer Storefront:   http://localhost:${PORT}`);
  console.log(`💼 Admin & POS Console:    http://localhost:${PORT}/admin.html`);
  console.log(`📦 REST API Base:         http://localhost:${PORT}/api/products`);
  console.log(`==================================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️ Port ${PORT} is already in use by another process.`);
    console.error(`💡 Run: npx kill-port ${PORT} and try again.\n`);
  } else {
    console.error('Server error:', err);
  }
});
