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
    cancellationDetails: row.cancellation_details ? (typeof row.cancellation_details === 'string' ? JSON.parse(row.cancellation_details) : row.cancellation_details) : null,
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

    // Load site settings for payment validation and combo bundle tracking
    const settingsRes = await client.query('SELECT data FROM site_settings WHERE id = 1');
    const siteSettings = settingsRes.rows.length > 0
      ? (typeof settingsRes.rows[0].data === 'string' ? JSON.parse(settingsRes.rows[0].data) : settingsRes.rows[0].data)
      : {};
    const pmSettings = siteSettings.paymentMethods || {};
    const comboSettings = siteSettings?.homeShowcase?.combo || null;

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

        // Dual Inventory Deductions for Combo Bundles
        if (comboSettings && (prodId === comboSettings.productId || prodId === 'prod_duo_03') && Array.isArray(comboSettings.selectedProductIds)) {
          for (const subProdId of comboSettings.selectedProductIds) {
            if (subProdId !== prodId) {
              const subRes = await client.query('SELECT id, name, stock FROM products WHERE id = $1', [subProdId]);
              if (subRes.rows.length > 0) {
                const subProd = subRes.rows[0];
                const subPrev = Number(subProd.stock) || 0;
                const subNew = Math.max(0, subPrev - qty);
                await client.query('UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2', [subNew, subProdId]);
                await client.query(`
                  INSERT INTO inventory_logs (
                    id, product_id, product_name, channel, reference,
                    change, prev_stock, new_stock, timestamp, reason
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
                `, [
                  `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                  subProd.id,
                  subProd.name,
                  'online',
                  orderNumber,
                  -qty,
                  subPrev,
                  subNew,
                  `Combo Bundle Item Deduction: ${prod.name} (${orderNumber})`
                ]);
              }
            }
          }
        }
      }
    }

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
      displayMethod = (body.paymentDetails && body.paymentDetails.upiProvider) ? `UPI (${body.paymentDetails.upiProvider})` : (rawMethod || 'UPI');
      paymentStatus = 'paid';
    } else if (/card|visa|master|rupay/i.test(rawMethod)) {
      normalizedCategory = 'card';
      displayMethod = (body.paymentDetails && body.paymentDetails.cardBrand) ? `Card (${body.paymentDetails.cardBrand})` : (rawMethod || 'Credit / Debit Card');
      paymentStatus = 'paid';
    } else if (/net banking|netbanking/i.test(rawMethod)) {
      normalizedCategory = 'netbanking';
      displayMethod = (body.paymentDetails && body.paymentDetails.bankName) ? `Net Banking (${body.paymentDetails.bankName})` : (rawMethod || 'Net Banking');
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

// 4. POST /api/orders/:id/cancel-request (Customer submits cancellation request with questionnaire)
router.post('/:id/cancel-request', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, comments, refundPreference } = req.body;

    const existing = await query('SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentOrder = existing.rows[0];
    if (currentOrder.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Delivered orders cannot be cancelled. You may contact care desk for returns.' });
    }
    if (currentOrder.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This order is already cancelled.' });
    }

    const cancellationData = {
      reason: reason || 'Customer requested cancellation',
      comments: comments || '',
      refundPreference: refundPreference || 'original_payment_source',
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };

    const updateRes = await query(`
      UPDATE orders 
      SET status = 'cancel_requested',
          cancellation_details = $1
      WHERE id = $2 OR order_number = $2
      RETURNING *
    `, [JSON.stringify(cancellationData), id]);

    res.json({
      success: true,
      message: 'Cancellation request submitted successfully. Awaiting admin review.',
      data: mapOrder(updateRes.rows[0])
    });
  } catch (err) {
    console.error('Error submitting cancellation request:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/orders/:id/cancel-approve (Admin Approves Cancellation, Processes Refund & Restores Inventory Stock)
router.post('/:id/cancel-approve', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { refundAmount, refundMode, refundUtr, refundNotes } = req.body;

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM orders WHERE id = $1 OR order_number = $1 FOR UPDATE', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderRow = existing.rows[0];
    const orderItems = typeof orderRow.items === 'string' ? JSON.parse(orderRow.items) : orderRow.items;
    const isOnlinePaid = !/cod|cash on delivery/i.test(orderRow.payment_method || '');

    // Restore stock back into unified matrix
    for (const item of orderItems) {
      const prodId = item.productId || item.id;
      const qty = Math.max(1, Number(item.qty || 1));
      const pRes = await client.query('SELECT id, name, stock, online_sold FROM products WHERE id = $1', [prodId]);
      if (pRes.rows.length > 0) {
        const prod = pRes.rows[0];
        const prevStock = Number(prod.stock) || 0;
        const newStock = prevStock + qty;
        const newOnlineSold = Math.max(0, (Number(prod.online_sold) || 0) - qty);

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
          orderRow.order_number,
          qty,
          prevStock,
          newStock,
          `Order #${orderRow.order_number} Cancellation Accepted & Restocked (+${qty})`
        ]);
      }
    }

    // Build approved cancellation details
    const existingCancelDetails = orderRow.cancellation_details 
      ? (typeof orderRow.cancellation_details === 'string' ? JSON.parse(orderRow.cancellation_details) : orderRow.cancellation_details) 
      : {};

    const updatedCancelDetails = {
      ...existingCancelDetails,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      refundAmount: Number(refundAmount !== undefined ? refundAmount : orderRow.total),
      refundMode: refundMode || (isOnlinePaid ? 'Original Source (UPI / Card)' : 'N/A (Cash on Delivery)'),
      refundUtr: refundUtr || `REF_${Date.now()}`,
      refundNotes: refundNotes || (isOnlinePaid ? 'Full refund initiated to customer account' : 'COD order cancelled prior to delivery')
    };

    const newPaymentStatus = isOnlinePaid ? 'refunded' : 'cancelled';

    const updateRes = await client.query(`
      UPDATE orders 
      SET status = 'cancelled',
          payment_status = $1,
          cancellation_details = $2
      WHERE id = $3 OR order_number = $3
      RETURNING *
    `, [newPaymentStatus, JSON.stringify(updatedCancelDetails), id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Order #${orderRow.order_number} cancelled successfully. Inventory restored and refund recorded.`,
      data: mapOrder(updateRes.rows[0])
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error approving cancellation:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// 6. POST /api/orders/:id/cancel-reject (Admin Rejects Cancellation Request)
router.post('/:id/cancel-reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const existing = await query('SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const orderRow = existing.rows[0];
    const existingCancelDetails = orderRow.cancellation_details 
      ? (typeof orderRow.cancellation_details === 'string' ? JSON.parse(orderRow.cancellation_details) : orderRow.cancellation_details) 
      : {};

    const updatedCancelDetails = {
      ...existingCancelDetails,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: rejectionReason || 'Order has already been prepared and dispatched via express courier.'
    };

    const updateRes = await query(`
      UPDATE orders 
      SET status = 'processing',
          cancellation_details = $1
      WHERE id = $2 OR order_number = $2
      RETURNING *
    `, [JSON.stringify(updatedCancelDetails), id]);

    res.json({
      success: true,
      message: `Cancellation request for Order #${orderRow.order_number} was rejected. Order returned to processing.`,
      data: mapOrder(updateRes.rows[0])
    });
  } catch (err) {
    console.error('Error rejecting cancellation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
