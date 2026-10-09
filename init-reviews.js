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

    // Check existing
    const check = await pool.query('SELECT COUNT(*) FROM reviews');
    if (parseInt(check.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO reviews (id, name, email, product_name, rating, title, comment, status, created_at)
        VALUES 
          ('rev_01', 'Pooja Madhavan', 'pooja.m@example.com', 'Herbal Hair Oil', 5, 'Monsoon hair fall stopped completely', 'The authentic lavender aroma and 18-herb Ayurvedic infusion restored my hair density within 3 weeks. Absolutely crown-worthy!', 'approved', NOW() - INTERVAL '3 days'),
          ('rev_02', 'Dr. Radhika Krishnan', 'radhika.k@example.com', 'The Royal Hair Ritual (Duo Set)', 5, 'Dermatologist verified clean care', 'As a clinician, I truly appreciate the pure solar steeping without sulfates or mineral oil. Noticeable improvement in strand resilience and shine.', 'approved', NOW() - INTERVAL '5 days'),
          ('rev_03', 'Ananya Sharma', 'ananya.s@example.com', 'Hibiscus Flower Shampoo', 5, 'Gentle on scalp, incredible natural gloss', 'A genuine sulfate-free cleanser that purifies without stripping moisture. The fresh hibiscus petal infusion leaves hair silky and light.', 'approved', NOW() - INTERVAL '7 days'),
          ('rev_04', 'Smt. Meenakshi Sundaram', 'meenakshi@example.com', 'Herbal Hair Oil', 5, 'Traditional apothecary at its finest', 'Sacred South Indian herbal wisdom in a modern glass dropper. Absorbs smoothly overnight with zero greasy residue on pillows.', 'approved', NOW() - INTERVAL '10 days'),
          ('rev_05', 'Kavitha Sundar', 'kavitha.test@example.com', 'The Royal Hair Ritual (Duo Set)', 5, 'Transformed dry frizzy hair', 'The ritual combo worked wonders on my rough ends. Both formulations complement each other flawlessly. Will repurchase forever!', 'approved', NOW() - INTERVAL '12 days'),
          ('rev_06', 'Karthikeyan V', 'karthik.v@example.com', 'Herbal Hair Oil', 5, 'Scalp itching completely vanished', 'Started using after a friend recommended it. In just five uses, dandruff flakes and dry scalp irritation completely vanished.', 'pending', NOW() - INTERVAL '2 hours'),
          ('rev_07', 'Divya Ramesh', 'divya.r@example.com', 'Hibiscus Flower Shampoo', 4, 'Very mild lather and pleasant aroma', 'Very gentle on color-treated hair. Subtle botanical fragrance lasts throughout the day.', 'pending', NOW() - INTERVAL '5 hours');
      `);
      console.log('✅ Reviews table created and initial reviews seeded.');
    } else {
      console.log('✅ Reviews table exists with ' + check.rows[0].count + ' records.');
    }
  } catch (err) {
    console.error('Error creating reviews table:', err);
  } finally {
    pool.end();
  }
}

initReviews();
