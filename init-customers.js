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

    await pool.query(`
      INSERT INTO customers (id, name, email, phone, password, address, city, state, pincode)
      VALUES 
        ('cust_01', 'Pooja Madhavan', 'pooja.m@example.com', '+91 98401 23456', 'pooja123', '42, Besant Avenue, Adyar', 'Chennai', 'Tamil Nadu', '600020'),
        ('cust_02', 'Ananya Sharma', 'ananya.s@example.com', '+91 98200 98765', 'ananya123', 'Flat 804, Oberoi Springs, Andheri West', 'Mumbai', 'Maharashtra', '400053')
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('✅ Customers table created and seeded successfully.');
  } catch (err) {
    console.error('Error creating customers table:', err);
  } finally {
    pool.end();
  }
}

initCustomers();
