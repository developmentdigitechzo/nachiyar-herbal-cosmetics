const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { requireAdminAuth } = require('./auth');

// GET /api/reviews - Public endpoint returning ONLY admin-approved reviews
router.get('/', async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, product_name, rating, title, comment, created_at FROM reviews WHERE status = 'approved' ORDER BY created_at DESC"
    );

    const reviews = result.rows;
    const totalCount = reviews.length;
    const avgRating = totalCount > 0 
      ? (reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / totalCount).toFixed(1) 
      : '5.0';

    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          total: totalCount,
          average: avgRating
        }
      }
    });
  } catch (err) {
    console.error('Error fetching public reviews:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve reviews.' });
  }
});

// POST /api/reviews - Public submission endpoint (stores with status = 'pending')
router.post('/', async (req, res) => {
  try {
    const { name, email, rating, comment, productName, title } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Reviewer name is required.' });
    }
    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Review message cannot be empty.' });
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    const reviewId = 'rev_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const cleanName = name.trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanProduct = (productName || 'Herbal Hair Care').trim();
    const cleanTitle = (title || '').trim();
    const cleanComment = comment.trim();

    await query(`
      INSERT INTO reviews (id, name, email, product_name, rating, title, comment, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
    `, [reviewId, cleanName, cleanEmail, cleanProduct, numRating, cleanTitle, cleanComment]);

    res.json({
      success: true,
      message: 'Thank you for your review! It has been submitted for admin verification and will be published upon approval.',
      data: { id: reviewId }
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

// GET /api/reviews/admin/all - Admin only: view all reviews with status counts
router.get('/admin/all', requireAdminAuth, async (req, res) => {
  try {
    const statusFilter = req.query.status;
    let sql = 'SELECT * FROM reviews';
    const params = [];

    if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      sql += ' WHERE status = $1';
      params.push(statusFilter);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);

    // Get count summary
    const countsRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM reviews
    `);

    res.json({
      success: true,
      data: {
        reviews: result.rows,
        counts: {
          total: Number(countsRes.rows[0].total || 0),
          pending: Number(countsRes.rows[0].pending || 0),
          approved: Number(countsRes.rows[0].approved || 0),
          rejected: Number(countsRes.rows[0].rejected || 0)
        }
      }
    });
  } catch (err) {
    console.error('Error fetching admin reviews:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews for admin.' });
  }
});

// PATCH /api/reviews/:id/status - Admin only: approve or reject a review
router.patch('/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be approved, rejected, or pending.' });
    }

    const result = await query(
      'UPDATE reviews SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    res.json({
      success: true,
      message: `Review successfully marked as ${status}.`,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating review status:', err);
    res.status(500).json({ success: false, message: 'Failed to update review status.' });
  }
});

// DELETE /api/reviews/:id - Admin only: delete review
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM reviews WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    res.json({
      success: true,
      message: 'Review successfully deleted.',
      data: { id }
    });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
});

module.exports = router;
