const { pool } = require('./server/src/config/db');

async function initCustomers() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Clean up sample demo customers
    await pool.query(`
      DELETE FROM customers WHERE email LIKE '%example.com' OR id LIKE 'cust_0%'
    `);

    console.log('✅ Customers table created and verified without dummy records.');
  } catch (err) {
    console.error('Error creating customers table:', err);
  } finally {
    pool.end();
  }
}

initCustomers();
