const express = require('express');
const router = express.Router();
const { pool, query } = require('../config/db');

function mapOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    channel: row.channel,
    customer: typeof row.customer === 'string' ? JSON.parse(row.customer) : row.customer,
    items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    shipping: Number(row.shipping),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    createdAt: row.created_at
  };
}

// 1. GET /api/orders
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows.map(mapOrder) });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/orders (Online order placement with transaction)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const body = req.body;
    if (!body.items || !body.items.length) {
      return res.status(400).json({ success: false, message: 'Cart items cannot be empty' });
    }

    await client.query('BEGIN');

    // Check stock for all items
    for (const item of body.items) {
      const prodId = item.productId || item.id;
      const checkRes = await client.query('SELECT id, name, stock FROM products WHERE id = $1 FOR UPDATE', [prodId]);
      if (checkRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: `Product ${item.name || prodId} not found` });
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

    // Get order count for orderNumber
    const countRes = await client.query('SELECT COUNT(*) FROM orders');
    const orderIndex = Number(countRes.rows[0].count) + 1;
    const orderNumber = `NH-ON-${1000 + orderIndex}`;
    const orderId = `ord_${Date.now()}`;

    // Deduct stock and write inventory logs
    for (const item of body.items) {
      const prodId = item.productId || item.id;
      const qty = Math.max(1, Number(item.qty || item.quantity || 1));
      const prodRes = await client.query('SELECT id, name, stock, online_sold FROM products WHERE id = $1', [prodId]);
      const prod = prodRes.rows[0];
      if (prod) {
        const prevStock = Number(prod.stock) || 0;
        const newStock = Math.max(0, prevStock - qty);
        const newOnlineSold = (Number(prod.online_sold) || 0) + qty;

        await client.query(
          'UPDATE products SET stock = $1, online_sold = $2, updated_at = NOW() WHERE id = $3',
          [newStock, newOnlineSold, prodId]
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
          'online',
          orderNumber,
          -qty,
          prevStock,
          newStock,
          `Online Customer Checkout (${body.customer ? (body.customer.fullName || body.customer.name) : 'Web'})`
        ]);
      }
    }

    // Verify Payment Method against Admin Settings
    const settingsRes = await client.query('SELECT data FROM site_settings WHERE id = 1');
    const siteSettings = settingsRes.rows.length > 0
      ? (typeof settingsRes.rows[0].data === 'string' ? JSON.parse(settingsRes.rows[0].data) : settingsRes.rows[0].data)
      : {};
    const pmSettings = siteSettings.paymentMethods || {};

    const rawMethod = String(body.paymentMethod || '').trim();
    let normalizedCategory = 'cod';
    let displayMethod = 'Cash on Delivery (COD)';
    let paymentStatus = 'pending'; // COD is pending payment upon delivery

    if (/cod|cash on delivery/i.test(rawMethod)) {
      normalizedCategory = 'cod';
      displayMethod = 'Cash on Delivery (COD)';
      paymentStatus = 'pending';
    } else if (/upi|gpay|phonepe|paytm/i.test(rawMethod)) {
      normalizedCategory = 'upi';
      displayMethod = body.paymentDetails?.upiProvider ? `UPI (${body.paymentDetails.upiProvider})` : (rawMethod || 'UPI');
      paymentStatus = 'paid';
    } else if (/card|visa|master|rupay/i.test(rawMethod)) {
      normalizedCategory = 'card';
      displayMethod = body.paymentDetails?.cardBrand ? `Card (${body.paymentDetails.cardBrand})` : (rawMethod || 'Credit / Debit Card');
      paymentStatus = 'paid';
    } else if (/net banking|netbanking/i.test(rawMethod)) {
      normalizedCategory = 'netbanking';
      displayMethod = body.paymentDetails?.bankName ? `Net Banking (${body.paymentDetails.bankName})` : (rawMethod || 'Net Banking');
      paymentStatus = 'paid';
    } else {
      normalizedCategory = 'other';
      displayMethod = rawMethod || 'Online Payment';
      paymentStatus = 'paid';
    }

    // Check if admin has disabled this payment method
    if (pmSettings[normalizedCategory] && pmSettings[normalizedCategory].enabled === false) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `The payment method "${displayMethod}" is currently disabled by store administrator. Please choose another payment method.`
      });
    }

    // Insert order record
    const insertSql = `
      INSERT INTO orders (
        id, order_number, channel, customer, items,
        subtotal, discount, shipping, total,
        payment_method, payment_status, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *;
    `;

    const values = [
      orderId,
      orderNumber,
      'online',
      JSON.stringify(body.customer || { name: 'Guest Customer', email: 'guest@example.com', phone: '', address: '' }),
      JSON.stringify(body.items),
      Number(body.subtotal) || 0,
      Number(body.discount) || 0,
      Number(body.shipping) || 0,
      Number(body.total) || 0,
      displayMethod,
      paymentStatus,
      'placed'
    ];

    const orderRes = await client.query(insertSql, values);
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: normalizedCategory === 'cod' ? 'Order confirmed for Cash on Delivery' : 'Order placed and payment verified successfully',
      data: mapOrder(orderRes.rows[0])
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error placing order:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// 2.5. GET /api/orders/:id (Fetch single order for confirmation and tracking)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: mapOrder(result.rows[0]) });
  } catch (err) {
    console.error('Error fetching order by ID:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
      'UPDATE orders SET status = $1 WHERE id = $2 OR order_number = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: mapOrder(result.rows[0]) });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
