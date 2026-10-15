const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../config/db');

// In-memory customer sessions: token -> customer
const customerSessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/customer/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, address, city, state, pincode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full Name, Email, and Password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(0, 10) : '';

    // Check if customer email already exists
    const existing = await query('SELECT id FROM customers WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please sign in.' });
    }

    const customerId = 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    await query(`
      INSERT INTO customers (id, name, email, phone, password, address, city, state, pincode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      customerId,
      name.trim(),
      cleanEmail,
      cleanPhone,
      password,
      address ? address.trim() : '',
      city ? city.trim() : '',
      state ? state.trim() : '',
      pincode ? pincode.trim() : ''
    ]);

    const customer = {
      id: customerId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      pincode: pincode ? pincode.trim() : ''
    };

    const token = generateToken();
    customerSessions.set(token, { customer, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });

    res.json({
      success: true,
      message: 'Account created successfully! Welcome to Nachiyar Herbals.',
      customer,
      token
    });
  } catch (err) {
    console.error('Customer registration error:', err);
    res.status(500).json({ success: false, message: 'Could not create account: ' + err.message });
  }
});

// POST /api/customer/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email/Username and Password are required.' });
    }

    const cleanIdentifier = email.trim().toLowerCase();

    // Search by email or phone or staff username
    const result = await query(`
      SELECT * FROM customers 
      WHERE LOWER(email) = $1 OR phone = $2
    `, [cleanIdentifier, cleanIdentifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Account not found. Please check your credentials or create an account.' });
    }

    const row = result.rows[0];

    if (row.password !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    const customer = {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      pincode: row.pincode
    };

    const token = generateToken();
    customerSessions.set(token, { customer, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });

    res.json({
      success: true,
      message: 'Welcome back, ' + customer.name,
      customer,
      token
    });
  } catch (err) {
    console.error('Customer login error:', err);
    res.status(500).json({ success: false, message: 'Login failed: ' + err.message });
  }
});

// GET /api/customer/orders
router.get('/orders', async (req, res) => {
  try {
    const email = req.query.email || '';
    const phone = req.query.phone || '';
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanDigits = (phone || '').replace(/\D/g, '').slice(-10);

    let sql = 'SELECT * FROM orders WHERE 1=0';
    const params = [];

    if (cleanEmail && cleanDigits) {
      sql = `
        SELECT * FROM orders 
        WHERE LOWER(customer->>'email') = $1 
           OR REGEXP_REPLACE(customer->>'phone', '\\D', '', 'g') LIKE '%' || $2
           OR LOWER(customer->>'email') LIKE '%' || $1 || '%'
        ORDER BY created_at DESC
      `;
      params.push(cleanEmail, cleanDigits);
    } else if (cleanEmail) {
      sql = `
        SELECT * FROM orders 
        WHERE LOWER(customer->>'email') = $1 
           OR LOWER(customer->>'email') LIKE '%' || $1 || '%'
        ORDER BY created_at DESC
      `;
      params.push(cleanEmail);
    } else if (cleanDigits) {
      sql = `
        SELECT * FROM orders 
        WHERE REGEXP_REPLACE(customer->>'phone', '\\D', '', 'g') LIKE '%' || $1
        ORDER BY created_at DESC
      `;
      params.push(cleanDigits);
    } else {
      return res.json({ success: true, data: [] });
    }

    const result = await query(sql, params);

    const orders = result.rows.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      channel: o.channel,
      customer: o.customer,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      shipping: Number(o.shipping),
      total: Number(o.total),
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      status: o.status || 'placed',
      cancellationDetails: o.cancellation_details ? (typeof o.cancellation_details === 'string' ? JSON.parse(o.cancellation_details) : o.cancellation_details) : null,
      createdAt: o.created_at
    }));

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Customer orders error:', err);
    res.status(500).json({ success: false, message: 'Could not fetch orders: ' + err.message });
  }
});

// GET /api/customer/orders/:orderNumber
router.get('/orders/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const result = await query('SELECT * FROM orders WHERE order_number = $1 OR id = $1', [orderNumber]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const o = result.rows[0];
    const order = {
      id: o.id,
      orderNumber: o.order_number,
      channel: o.channel,
      customer: o.customer,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      shipping: Number(o.shipping),
      total: Number(o.total),
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      status: o.status || 'placed',
      cancellationDetails: o.cancellation_details ? (typeof o.cancellation_details === 'string' ? JSON.parse(o.cancellation_details) : o.cancellation_details) : null,
      createdAt: o.created_at
    };
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customer/orders/:orderNumber/cancel
router.post('/orders/:orderNumber/cancel', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { reason, comments, refundPreference } = req.body;

    const existing = await query('SELECT * FROM orders WHERE order_number = $1 OR id = $1', [orderNumber]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentOrder = existing.rows[0];
    if (currentOrder.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Delivered orders cannot be cancelled.' });
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
      WHERE order_number = $2 OR id = $2
      RETURNING *
    `, [JSON.stringify(cancellationData), orderNumber]);

    res.json({
      success: true,
      message: 'Cancellation request submitted successfully. Awaiting admin review.',
      data: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customer/profile
router.get('/profile', async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    const result = await query('SELECT id, name, email, phone, address, city, state, pincode FROM customers WHERE LOWER(email) = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/customer/profile
router.put('/profile', async (req, res) => {
  try {
    const { email, name, phone, address, city, state, pincode } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    await query(`
      UPDATE customers 
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          address = COALESCE($3, address),
          city = COALESCE($4, city),
          state = COALESCE($5, state),
          pincode = COALESCE($6, pincode)
      WHERE LOWER(email) = $7
    `, [name, phone, address, city, state, pincode, email.toLowerCase()]);

    const updated = await query('SELECT id, name, email, phone, address, city, state, pincode FROM customers WHERE LOWER(email) = $1', [email.toLowerCase()]);
    res.json({ success: true, customer: updated.rows[0], message: 'Profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
