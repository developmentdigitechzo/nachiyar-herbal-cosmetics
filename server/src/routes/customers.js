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

// GET /api/customer/firebase-config
router.get('/firebase-config', (req, res) => {
  const apiKey = (process.env.FIREBASE_API_KEY || '').trim();
  const authDomain = (process.env.FIREBASE_AUTH_DOMAIN || '').trim();
  const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
  const storageBucket = (process.env.FIREBASE_STORAGE_BUCKET || '').trim();
  const messagingSenderId = (process.env.FIREBASE_MESSAGING_SENDER_ID || '').trim();
  const appId = (process.env.FIREBASE_APP_ID || '').trim();
  const measurementId = (process.env.FIREBASE_MEASUREMENT_ID || '').trim();

  const isConfigured = Boolean(apiKey && projectId && !apiKey.includes('YOUR_FIREBASE_API_KEY'));

  res.json({
    success: true,
    configured: isConfigured,
    config: isConfigured ? {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId
    } : null
  });
});

// POST /api/customer/google-auth
router.post('/google-auth', async (req, res) => {
  try {
    const { credential, email, name, picture, googleId, firebaseUid } = req.body;

    let userEmail = email;
    let userName = name;
    let userPicture = picture;
    let userGoogleId = firebaseUid || googleId;

    // If Google ID token credential passed (standard Google Identity Services JWT)
    if (credential) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          userEmail = payload.email || userEmail;
          userName = payload.name || userName;
          userPicture = payload.picture || userPicture;
          userGoogleId = payload.sub || userGoogleId;
        }
      } catch (jwtErr) {
        console.warn('Could not decode Google credential JWT:', jwtErr.message);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ success: false, message: 'Google account email is required.' });
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const cleanName = (userName || cleanEmail.split('@')[0]).trim();

    // Ensure columns exist safely
    try {
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar TEXT;`);
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);`);
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';`);
    } catch (colErr) {
      // Columns may already exist
    }

    // Check if customer already exists by Firebase UID or email
    const existing = await query('SELECT * FROM customers WHERE id = $1 OR LOWER(email) = $2', [userGoogleId || '', cleanEmail]);

    let customer;
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (userPicture || userGoogleId) {
        await query(`
          UPDATE customers 
          SET avatar = COALESCE($1, avatar),
              google_id = COALESCE($2, google_id),
              auth_provider = 'google'
          WHERE id = $3 OR LOWER(email) = $4
        `, [userPicture, userGoogleId, row.id, cleanEmail]);
      }

      customer = {
        id: row.id,
        name: row.name || cleanName,
        email: row.email,
        phone: row.phone || '',
        address: row.address || '',
        city: row.city || '',
        state: row.state || 'Tamil Nadu',
        pincode: row.pincode || '',
        avatar: userPicture || row.avatar || '',
        authProvider: 'google'
      };
    } else {
      // Create new customer with Firebase UID as the unique user ID
      const customerId = firebaseUid || userGoogleId || ('cust_g_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
      const generatedPass = 'FIREBASE_AUTH_' + crypto.randomBytes(8).toString('hex');

      await query(`
        INSERT INTO customers (id, name, email, phone, password, address, city, state, pincode, avatar, google_id, auth_provider)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'google')
      `, [
        customerId,
        cleanName,
        cleanEmail,
        '',
        generatedPass,
        '',
        '',
        'Tamil Nadu',
        '',
        userPicture || '',
        userGoogleId || ''
      ]);

      customer = {
        id: customerId,
        name: cleanName,
        email: cleanEmail,
        phone: '',
        address: '',
        city: '',
        state: 'Tamil Nadu',
        pincode: '',
        avatar: userPicture || '',
        authProvider: 'google'
      };
    }

    const token = generateToken();
    customerSessions.set(token, { customer, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });

    res.json({
      success: true,
      message: `Signed in successfully with Google as ${customer.name}`,
      customer,
      token
    });
  } catch (err) {
    console.error('Customer Google auth error:', err);
    res.status(500).json({ success: false, message: 'Google sign in failed: ' + err.message });
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
