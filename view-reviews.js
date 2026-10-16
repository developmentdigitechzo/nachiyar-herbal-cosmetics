/**
 * Customer Reviews Terminal Viewer for Nachiyar Herbals
 * Usage:
 *   node view-reviews.js
 *   npm run reviews
 */

const { query } = require('./server/src/config/db');

async function showReviews() {
  console.log('\n========================================================================================');
  console.log('🌿 NACHIYAR HERBALS & COSMETICS - CUSTOMER REVIEWS DIRECTORY');
  console.log('========================================================================================\n');

  try {
    const res = await query(`
      SELECT 
        id, 
        name, 
        email, 
        product_name, 
        rating, 
        status, 
        title,
        comment, 
        TO_CHAR(created_at, 'DD-Mon-YYYY HH12:MI AM') as date
      FROM reviews 
      ORDER BY created_at DESC
    `);

    if (res.rows.length === 0) {
      console.log('ℹ️ No customer reviews found in database.\n');
      return;
    }

    console.log(`📊 Total Reviews: ${res.rows.length}\n`);

    res.rows.forEach((r, idx) => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const statusBadge = r.status === 'approved' 
        ? '✅ APPROVED' 
        : (r.status === 'pending' ? '⏳ PENDING' : '❌ REJECTED');

      console.log(`----------------------------------------------------------------------------------------`);
      console.log(`[${idx + 1}] ID: ${r.id} | Status: ${statusBadge} | Date: ${r.date}`);
      console.log(`👤 Customer:    ${r.name} (${r.email || 'No Email'})`);
      console.log(`🛍️ Product:     ${r.product_name}`);
      console.log(`⭐ Rating:      ${stars} (${r.rating}/5)`);
      if (r.title) {
        console.log(`📌 Title:       ${r.title}`);
      }
      console.log(`💬 Comment:     "${r.comment}"`);
    });

    console.log(`----------------------------------------------------------------------------------------\n`);
    console.log(`💡 Quick Summary:`);
    const approvedCount = res.rows.filter(r => r.status === 'approved').length;
    const pendingCount = res.rows.filter(r => r.status === 'pending').length;
    const rejectedCount = res.rows.filter(r => r.status === 'rejected').length;
    console.log(`   ✅ Approved: ${approvedCount}  |  ⏳ Pending: ${pendingCount}  |  ❌ Rejected: ${rejectedCount}\n`);

  } catch (err) {
    console.error('❌ Error reading reviews from database:', err.message);
  } finally {
    process.exit(0);
  }
}

showReviews();
