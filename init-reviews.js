const { pool } = require('./server/src/config/db');

async function initReviews() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        product_name VARCHAR(255) DEFAULT 'Herbal Hair Care',
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);
    `);

    // Delete any previous dummy/sample reviews if present
    await pool.query(`
      DELETE FROM reviews 
      WHERE email LIKE '%example.com' OR email LIKE '%.test@%' OR id LIKE 'rev_0%'
    `);

    console.log('✅ Reviews table created and verified without dummy records.');
  } catch (err) {
    console.error('Error creating reviews table:', err);
  } finally {
    pool.end();
  }
}

initReviews();
