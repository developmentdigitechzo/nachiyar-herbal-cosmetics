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
        announcementText: settings.announcementText || 'ROYAL BOTANICAL CARE • FREE PAN-INDIA SHIPPING OVER ₹599',
        freeShippingThreshold: settings.freeShippingThreshold || 599,
        paymentMethods: settings.paymentMethods || {},
        brandName: settings.brandName || 'Nachiyar Herbals & Cosmetics',
        gstin: settings.gstin || '33AAACH9876K1Z2',
        supportPhone: settings.supportPhone || '+91 94440 88990',
        supportEmail: settings.supportEmail || 'care@nachiyarherbals.com',
        storeTimings: settings.storeTimings || 'Mon - Sat: 9:30 AM - 8:30 PM',
        storeAddress: settings.storeAddress || 'Nachiyar Botanical Heritage, No. 18 Temple Ring Road, Madurai, Tamil Nadu - 625001',
        couponCode: settings.couponCode || 'ROYAL15',
        discountPercent: Number(settings.discountPercent) || 15,
        couponExpiryDate: settings.couponExpiryDate || '',
        couponActive: settings.couponActive !== false && settings.couponActive !== 'false',
        couponTagline: settings.couponTagline || 'Surprise Royal Privilege Voucher'
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
