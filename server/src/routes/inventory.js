const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// 1. GET /api/inventory
router.get('/', async (req, res) => {
  try {
    const productsRes = await query('SELECT * FROM products ORDER BY name ASC');
    const logsRes = await query('SELECT * FROM inventory_logs ORDER BY timestamp DESC LIMIT 20');

    const matrix = productsRes.rows.map(p => {
      const stock = Number(p.stock);
      const variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : (p.variants || []);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        initialStock: Number(p.initial_stock) || stock,
        onlineSold: Number(p.online_sold) || 0,
        offlineSold: Number(p.offline_sold) || 0,
        currentStock: stock,
        status: stock <= 0 ? 'Out of Stock' : (stock < 15 ? 'Low Stock' : 'Optimal'),
        variants: variants
      };
    });

    const logs = logsRes.rows.map(l => ({
      id: l.id,
      productId: l.product_id,
      productName: l.product_name,
      channel: l.channel,
      reference: l.reference,
      change: Number(l.change),
      prevStock: Number(l.prev_stock),
      newStock: Number(l.new_stock),
      timestamp: l.timestamp,
      reason: l.reason
    }));

    res.json({
      success: true,
      data: {
        inventory: matrix,
        logs: logs
      }
    });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/inventory/adjust (Manual Restock)
router.post('/adjust', async (req, res) => {
  try {
    const { productId, adjustment, reference, reason } = req.body;
    const change = Number(adjustment);

    if (!productId || isNaN(change)) {
      return res.status(400).json({ success: false, message: 'Invalid productId or adjustment value' });
    }

    const prodRes = await query('SELECT id, name, stock FROM products WHERE id = $1', [productId]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const prod = prodRes.rows[0];
    const prevStock = Number(prod.stock);
    const newStock = Math.max(0, prevStock + change);

    await query('UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2', [newStock, productId]);

    await query(`
      INSERT INTO inventory_logs (
        id, product_id, product_name, channel, reference,
        change, prev_stock, new_stock, timestamp, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
    `, [
      `log_${Date.now()}`,
      prod.id,
      prod.name,
      'manual',
      reference || 'Manual Restock',
      change,
      prevStock,
      newStock,
      reason || 'Restocked by inventory manager'
    ]);

    res.json({ success: true, currentStock: newStock });
  } catch (err) {
    console.error('Error adjusting inventory:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
