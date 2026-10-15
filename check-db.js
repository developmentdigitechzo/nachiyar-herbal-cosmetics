const { pool } = require('./server/src/config/db');

async function checkDatabase() {
  console.log('\n========================================================');
  console.log('       NACHIYAR HERBALS - DATABASE STATUS CHECK         ');
  console.log('========================================================\n');

  try {
    // 1. Check all tables and row counts
    const tables = [
      'products',
      'orders',
      'customers',
      'reviews',
      'invoices',
      'inventory_logs',
      'users',
      'site_settings'
    ];

    console.log('📊 [1] TABLE ROW COUNTS:');
    console.log('--------------------------------------------------------');
    for (const tbl of tables) {
      const res = await pool.query(`SELECT count(*) as count FROM ${tbl}`);
      console.log(`  ✓ ${tbl.padEnd(16)} : ${res.rows[0].count} rows`);
    }

    // 2. Latest 3 Orders
    console.log('\n🛍️  [2] RECENT ONLINE ORDERS:');
    console.log('--------------------------------------------------------');
    const ordersRes = await pool.query(`
      SELECT order_number, total, payment_method, status, to_char(created_at, 'DD-Mon-YYYY HH12:MI AM') as time 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    console.table(ordersRes.rows);

    // 3. Products Stock Status
    console.log('\n🌿 [3] PRODUCTS & LIVE STOCK:');
    console.log('--------------------------------------------------------');
    const prodRes = await pool.query(`
      SELECT id, name, price, stock 
      FROM products 
      ORDER BY id ASC
    `);
    console.table(prodRes.rows);

    // 4. Latest Customers
    console.log('\n👤 [4] RECENT REGISTERED CUSTOMERS:');
    console.log('--------------------------------------------------------');
    const custRes = await pool.query(`
      SELECT name, email, phone, city 
      FROM customers 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    console.table(custRes.rows);

    // 5. Latest Reviews
    console.log('\n⭐ [5] RECENT PRODUCT REVIEWS:');
    console.log('--------------------------------------------------------');
    const revRes = await pool.query(`
      SELECT product_name, name, rating, status 
      FROM reviews 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    console.table(revRes.rows);

    // 6. Registered Admin Accounts (Users Table)
    console.log('\n👑 [6] AUTHORIZED ADMIN ACCOUNTS (USERS TABLE):');
    console.log('--------------------------------------------------------');
    const usersRes = await pool.query(`
      SELECT id, username, name, email, phone, role, to_char(created_at, 'DD-Mon-YYYY HH12:MI AM') as created_at
      FROM users 
      ORDER BY created_at DESC
    `);
    console.table(usersRes.rows);

    console.log('\n========================================================');
    console.log('  STATUS: All Database Tables are Healthy and Connected! ');
    console.log('========================================================\n');

  } catch (err) {
    console.error('❌ Database Check Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkDatabase();
