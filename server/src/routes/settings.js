const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// GET /api/settings/public (Public for storefront announcements & enabled checkout payment methods)
router.get('/public', async (req, res) => {
  try {
    const result = await query('SELECT data FROM site_settings WHERE id = 1');
    const settings = result.rows.length > 0 ? (typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data) : {};
    // Return storefront-relevant public settings
    res.json({
      success: true,
      data: {
        announcementText: settings.announcementText,
        freeShippingThreshold: settings.freeShippingThreshold || 599,
        paymentMethods: settings.paymentMethods || {},
        brandName: settings.brandName,
        supportPhone: settings.supportPhone
      }
    });
  } catch (err) {
    console.error('Error fetching public settings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings (Full settings for admin console)
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT data FROM site_settings WHERE id = 1');
    const settings = result.rows.length > 0 ? (typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data) : {};
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const body = req.body;
    const existing = await query('SELECT data FROM site_settings WHERE id = 1');
    let current = {};
    if (existing.rows.length > 0) {
      current = typeof existing.rows[0].data === 'string' ? JSON.parse(existing.rows[0].data) : existing.rows[0].data;
    }
    const updated = { ...current, ...body };

    await query(`
      INSERT INTO site_settings (id, data) VALUES (1, $1)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `, [JSON.stringify(updated)]);

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
