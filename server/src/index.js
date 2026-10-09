require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Test DB connection before listening
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Could not connect to PostgreSQL:', err);
  } else {
    console.log('✅ PostgreSQL connected successfully at:', res.rows[0].now);
  }
});

app.listen(PORT, () => {
  console.log(`==================================================================`);
  console.log(`🌿 NACHIYAR HERBALS & COSMETICS - NODE + EXPRESS + POSTGRESQL`);
  console.log(`📡 REST API Server listening on: http://localhost:${PORT}`);
  console.log(`📦 Health check:                http://localhost:${PORT}/api/health`);
  console.log(`🧴 Products API:                 http://localhost:${PORT}/api/products`);
  console.log(`==================================================================`);
});
