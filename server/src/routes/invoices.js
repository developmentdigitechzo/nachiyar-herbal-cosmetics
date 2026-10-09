const express = require('express');
const router = express.Router();
const { pool, query } = require('../config/db');

function mapInvoice(row) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    channel: row.channel,
    customer: typeof row.customer === 'string' ? JSON.parse(row.customer) : row.customer,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    tax: Number(row.tax),
    total: Number(row.total),
    paymentStatus: row.payment_status,
    paymentMode: row.payment_mode,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

// 1. GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows.map(mapInvoice) });
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/invoices (Create Offline Invoice / POS Billing)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body;
    if (!body.items || !body.items.length) {
      return res.status(400).json({ success: false, message: 'Invoice must contain at least one product' });
    }

    await client.query('BEGIN');

    // Check stock for all items
    for (const item of body.items) {
      const checkRes = await client.query('SELECT id, name, stock FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
      if (checkRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
      }
      const prod = checkRes.rows[0];
      if (prod.stock < item.qty) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${prod.name}. Available: ${prod.stock}`
        });
      }
    }

    const countRes = await client.query('SELECT COUNT(*) FROM invoices');
    const invCount = Number(countRes.rows[0].count) + 1;
    const invoiceNumber = `NH-INV-2026-${invCount.toString().padStart(3, '0')}`;
    const invoiceId = `inv_${Date.now()}`;

    // Deduct stock for offline sale and write inventory logs
    for (const item of body.items) {
      const prodRes = await client.query('SELECT id, name, stock, offline_sold FROM products WHERE id = $1', [item.productId]);
      const prod = prodRes.rows[0];
      const prevStock = Number(prod.stock);
      const newStock = Math.max(0, prevStock - item.qty);
      const newOfflineSold = (Number(prod.offline_sold) || 0) + item.qty;

      await client.query(
        'UPDATE products SET stock = $1, offline_sold = $2, updated_at = NOW() WHERE id = $3',
        [newStock, newOfflineSold, item.productId]
      );

      await client.query(`
        INSERT INTO inventory_logs (
          id, product_id, product_name, channel, reference,
          change, prev_stock, new_stock, timestamp, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      `, [
        `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        prod.id,
        prod.name,
        'offline',
        invoiceNumber,
        -item.qty,
        prevStock,
        newStock,
        `Offline Invoice / Store Sale to ${body.customer ? body.customer.name : 'Customer'}`
      ]);
    }

    const insertSql = `
      INSERT INTO invoices (
        id, invoice_number, channel, customer, items,
        subtotal, discount, tax, total,
        payment_status, payment_mode, notes, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *;
    `;

    const values = [
      invoiceId,
      invoiceNumber,
      'offline',
      JSON.stringify(body.customer || { name: 'Walk-in Customer', phone: '', email: '', address: '', gstin: '' }),
      JSON.stringify(body.items),
      Number(body.subtotal) || 0,
      Number(body.discount) || 0,
      Number(body.tax) || 0,
      Number(body.total) || 0,
      body.paymentStatus || 'paid',
      body.paymentMode || 'Cash',
      body.notes || 'In-store retail billing',
      body.createdBy || 'Sales Staff'
    ];

    const invRes = await client.query(insertSql, values);
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Invoice generated and inventory updated successfully',
      data: mapInvoice(invRes.rows[0])
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating invoice:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// 3. GET /api/invoices/:id (Single invoice with settings for printout)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invRes = await query(
      'SELECT * FROM invoices WHERE id = $1 OR invoice_number = $1 LIMIT 1',
      [id]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const settingsRes = await query('SELECT data FROM site_settings WHERE id = 1');
    const settings = settingsRes.rows.length > 0 ? (typeof settingsRes.rows[0].data === 'string' ? JSON.parse(settingsRes.rows[0].data) : settingsRes.rows[0].data) : {};

    res.json({
      success: true,
      data: mapInvoice(invRes.rows[0]),
      settings
    });
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
