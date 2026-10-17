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
        couponTagline: settings.couponTagline || 'Surprise Royal Privilege Voucher',
        googleClientId: process.env.GOOGLE_CLIENT_ID || settings.googleClientId || '',
        firebaseConfig: (process.env.FIREBASE_API_KEY && !process.env.FIREBASE_API_KEY.includes('YOUR_FIREBASE_API_KEY')) ? {
          apiKey: process.env.FIREBASE_API_KEY,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
          projectId: process.env.FIREBASE_PROJECT_ID || '',
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
          appId: process.env.FIREBASE_APP_ID || '',
          measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
        } : null,
        homeShowcase: settings.homeShowcase || {
          slot1: { productId: 'prod_oil_01', title: 'Herbal Hair Oil', price: 299, mrp: 599, customImage: 'assets/new-oil-bottle-card.jpg' },
          slot2: { productId: 'prod_shampoo_02', title: 'Hibiscus Flower Shampoo', price: 249, mrp: 549, customImage: 'assets/new-shampoo-bottle-card.jpg' },
          combo: { productId: 'prod_duo_03', title: 'The Royal Hair Ritual (Duo Set)', price: 499, mrp: 1148, customImage: 'assets/duo-ritual-new.jpg', tag: 'BEST VALUE: SAVE ₹149' }
        }
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

// POST /api/settings/home-showcase
router.post('/home-showcase', async (req, res) => {
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { slot, productId, selectedProductIds, customImage, price, mrp, title, subtitle, description, tag, features, remove, swap } = payload;

    const existing = await query('SELECT data FROM site_settings WHERE id = 1');
    let current = {};
    if (existing.rows.length > 0) {
      current = typeof existing.rows[0].data === 'string' ? JSON.parse(existing.rows[0].data) : existing.rows[0].data;
    }

    if (!current.homeShowcase) {
      current.homeShowcase = {
        slot1: { productId: 'prod_oil_01', title: 'Herbal Hair Oil', price: 299, mrp: 599, customImage: 'assets/new-oil-bottle-card.jpg' },
        slot2: { productId: 'prod_shampoo_02', title: 'Hibiscus Flower Shampoo', price: 249, mrp: 549, customImage: 'assets/new-shampoo-bottle-card.jpg' },
        combo: { productId: 'prod_duo_03', title: 'The Royal Hair Ritual (Duo Set)', price: 499, mrp: 1148, customImage: 'assets/duo-ritual-new.jpg', tag: 'BEST VALUE: SAVE ₹149' }
      };
    }

    // 1. SWAP SLOTS (1 ⇄ 2)
    if (swap) {
      const slot1 = current.homeShowcase.slot1 || { productId: 'prod_oil_01', title: 'Herbal Hair Oil', price: 299, mrp: 599, customImage: 'assets/new-oil-bottle-card.jpg' };
      const slot2 = current.homeShowcase.slot2 || { productId: 'prod_shampoo_02', title: 'Hibiscus Flower Shampoo', price: 249, mrp: 549, customImage: 'assets/new-shampoo-bottle-card.jpg' };
      
      current.homeShowcase.slot1 = slot2;
      current.homeShowcase.slot2 = slot1;
      current.homeShowcase.updatedAt = new Date().toISOString();

      await query(`
        INSERT INTO site_settings (id, data) VALUES (1, $1)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
      `, [JSON.stringify(current)]);

      return res.json({
        success: true,
        message: 'Flagship 1 and Flagship 2 positions swapped successfully!',
        homeShowcase: current.homeShowcase
      });
    }

    // Validate slot for assignment or removal
    if (!slot || !['slot1', 'slot2', 'combo'].includes(slot)) {
      return res.status(400).json({ success: false, message: 'Valid slot (slot1, slot2, or combo) is required.' });
    }

    // 2. TRUE REMOVAL (Mark as removed and disabled so fallback doesn't resurrect it)
    if (remove) {
      current.homeShowcase[slot] = {
        removed: true,
        disabled: true,
        productId: null,
        title: '',
        customImage: '',
        price: 0,
        mrp: 0,
        updatedAt: new Date().toISOString()
      };
    } else {
      let prodObj = null;
      if (productId) {
        const prodRes = await query('SELECT * FROM products WHERE id = $1', [productId]);
        if (prodRes.rows.length > 0) prodObj = prodRes.rows[0];
      }

      current.homeShowcase[slot] = {
        removed: false,
        disabled: false,
        productId: productId || current.homeShowcase[slot]?.productId || 'prod_duo_03',
        customImage: customImage || (prodObj && prodObj.images ? (typeof prodObj.images === 'string' ? JSON.parse(prodObj.images)[0] : prodObj.images[0]) : (current.homeShowcase[slot]?.customImage || '')),
        price: (price !== undefined && price !== '') ? Number(price) : (prodObj ? Number(prodObj.price) : current.homeShowcase[slot]?.price || 0),
        mrp: (mrp !== undefined && mrp !== '') ? Number(mrp) : (prodObj ? Number(prodObj.mrp) : current.homeShowcase[slot]?.mrp || 0),
        title: title || (prodObj ? prodObj.name : current.homeShowcase[slot]?.title || ''),
        subtitle: subtitle || (prodObj ? prodObj.subtitle : current.homeShowcase[slot]?.subtitle || ''),
        description: description !== undefined ? description : (prodObj ? prodObj.description : current.homeShowcase[slot]?.description || ''),
        tag: tag !== undefined ? tag : (current.homeShowcase[slot]?.tag || ''),
        features: features || current.homeShowcase[slot]?.features || [],
        selectedProductIds: (slot === 'combo' && Array.isArray(selectedProductIds)) ? selectedProductIds : (current.homeShowcase[slot]?.selectedProductIds || ['prod_oil_01', 'prod_shampoo_02']),
        updatedAt: new Date().toISOString()
      };

      // If updating combo and we have an associated product, sync prices and images in products table
      if (slot === 'combo' && productId) {
        try {
          const comboImg = customImage ? JSON.stringify([customImage]) : undefined;
          await query(`
            UPDATE products 
            SET price = COALESCE($1, price),
                mrp = COALESCE($2, mrp),
                name = COALESCE($3, name),
                images = COALESCE($4, images),
                description = COALESCE($5, description),
                updated_at = NOW()
            WHERE id = $6
          `, [
            (price !== undefined && price !== '') ? Number(price) : null,
            (mrp !== undefined && mrp !== '') ? Number(mrp) : null,
            title || null,
            comboImg || null,
            description || null,
            productId
          ]);
        } catch (e) {
          console.warn('Sync combo product warning:', e.message);
        }
      }
    }

    current.homeShowcase.updatedAt = new Date().toISOString();

    await query(`
      INSERT INTO site_settings (id, data) VALUES (1, $1)
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `, [JSON.stringify(current)]);

    res.json({
      success: true,
      message: remove ? `Removed ${slot} from Home Page showcase.` : `Home showcase ${slot} updated successfully.`,
      homeShowcase: current.homeShowcase
    });
  } catch (err) {
    console.error('Error updating home showcase:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
