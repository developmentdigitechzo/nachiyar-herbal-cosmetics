const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../config/db');
const config = require('../config/environment');
const { sendOtpEmail } = require('../services/mailer');

// In-memory customer sessions: token -> { customer, expiresAt }
const customerSessions = new Map();

// In-memory OTP store for email password verification: email -> { otp, expiresAt }
const otpStore = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyCustomerToken(token) {
  if (!token) return null;
  const session = customerSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    customerSessions.delete(token);
    return null;
  }
  return session.customer;
}

// Cookie configuration for customer sessions
const CUSTOMER_COOKIE_OPTIONS = {
  maxAge: 30 * 24 * 60 * 60 * 1000,
  httpOnly: false, // Accessible to client-side scripts for API authorization headers
  sameSite: 'lax',
  path: '/'
};

// GET /api/customer/google-config (Expose Web Client ID to GIS frontend safely)
router.get('/google-config', (req, res) => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || config.google?.clientId || '').trim();
  const isConfigured = Boolean(clientId && clientId.length > 10 && !clientId.includes('your_google'));

  res.json({
    success: true,
    configured: isConfigured,
    clientId: isConfigured ? clientId : ''
  });
});

// GET /api/customer/session (Verify authenticated server session without relying on localStorage)
router.get('/session', (req, res) => {
  const token = (req.cookies && req.cookies.nachiyar_customer_token) ||
                (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', '')) ||
                req.headers['x-customer-token'] ||
                req.query.token;

  const customer = verifyCustomerToken(token);
  if (!customer) {
    return res.status(401).json({ success: false, authenticated: false, message: 'No active session' });
  }

  res.json({ success: true, authenticated: true, customer });
});

// POST /api/customer/logout (Terminate server session and clear cookies)
router.post('/logout', (req, res) => {
  const token = (req.cookies && req.cookies.nachiyar_customer_token) ||
                (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', '')) ||
                req.headers['x-customer-token'] ||
                req.body?.token;

  if (token) {
    customerSessions.delete(token);
  }

  res.clearCookie('nachiyar_customer_token', { path: '/', sameSite: 'lax' });
  res.json({ success: true, message: 'Signed out successfully' });
});

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

    res.cookie('nachiyar_customer_token', token, CUSTOMER_COOKIE_OPTIONS);

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

    res.cookie('nachiyar_customer_token', token, CUSTOMER_COOKIE_OPTIONS);

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

// POST /api/customer/google-auth (Cryptographically verify Google ID Token & authenticate customer)
router.post('/google-auth', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token (credential) is required.'
      });
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || config.google?.clientId || '').trim();
    if (!clientId || clientId.includes('your_google')) {
      return res.status(500).json({
        success: false,
        message: 'Google Sign-In is not configured on the server. Please set GOOGLE_CLIENT_ID in the environment (.env).'
      });
    }

    // Cryptographic verification of Google ID token using Google's public certificates
    let ticket;
    try {
      const client = new OAuth2Client(clientId);
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId
      });
    } catch (verifyErr) {
      console.error('Google ID token verification failed:', verifyErr.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google ID token. Cryptographic verification failed: ' + verifyErr.message
      });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication payload missing required email information.'
      });
    }

    const googleSub = payload.sub; // Google's unique, permanent user ID
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanName = (payload.name || cleanEmail.split('@')[0]).trim();
    const userPicture = payload.picture || '';

    // Ensure database columns exist safely
    try {
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar TEXT;`);
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);`);
      await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';`);
    } catch (colErr) {
      // Columns already exist
    }

    // Check if customer already exists by Google ID or verified Email
    const existing = await query(
      'SELECT * FROM customers WHERE google_id = $1 OR LOWER(email) = $2',
      [googleSub, cleanEmail]
    );

    let customer;
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      await query(`
        UPDATE customers 
        SET avatar = COALESCE(NULLIF($1, ''), avatar),
            google_id = COALESCE(NULLIF($2, ''), google_id),
            auth_provider = 'google'
        WHERE id = $3
      `, [userPicture, googleSub, row.id]);

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
      // Create new customer with Google credentials in PostgreSQL
      const customerId = 'cust_g_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const generatedPass = 'GOOGLE_AUTH_' + crypto.randomBytes(16).toString('hex');

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
        googleSub
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

    // Generate secure session token (valid 30 days)
    const token = generateToken();
    customerSessions.set(token, { customer, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });

    res.cookie('nachiyar_customer_token', token, CUSTOMER_COOKIE_OPTIONS);

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
        WHERE LOWER(TRIM(COALESCE(customer->>'email', ''))) = $1 
           OR (LENGTH($2) >= 8 AND REGEXP_REPLACE(COALESCE(customer->>'phone', ''), '[^0-9]', '', 'g') LIKE '%' || $2)
           OR (LENGTH($1) > 3 AND LOWER(COALESCE(customer->>'email', '')) LIKE '%' || $1 || '%')
           OR LOWER(COALESCE(customer->>'id', '')) = $1
        ORDER BY created_at DESC
      `;
      params.push(cleanEmail, cleanDigits);
    } else if (cleanEmail) {
      sql = `
        SELECT * FROM orders 
        WHERE LOWER(TRIM(COALESCE(customer->>'email', ''))) = $1 
           OR (LENGTH($1) > 3 AND LOWER(COALESCE(customer->>'email', '')) LIKE '%' || $1 || '%')
           OR LOWER(COALESCE(customer->>'id', '')) = $1
        ORDER BY created_at DESC
      `;
      params.push(cleanEmail);
    } else if (cleanDigits) {
      sql = `
        SELECT * FROM orders 
        WHERE (LENGTH($1) >= 8 AND REGEXP_REPLACE(COALESCE(customer->>'phone', ''), '[^0-9]', '', 'g') LIKE '%' || $1)
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

// Mask email helper: e.g. "muraliii@gmail.com" -> "mu****@gmail.com"
function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user}****@${domain}`;
  return `${user.slice(0, 2)}${'*'.repeat(Math.min(user.length - 2, 4))}@${domain}`;
}

// 1. GET /api/customer/password-status (Check if user has custom password or Google initial auth)
router.get('/password-status', async (req, res) => {
  try {
    const token = (req.cookies && req.cookies.nachiyar_customer_token) ||
                  (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', '')) ||
                  req.headers['x-customer-token'] ||
                  req.query.token;

    let email = req.query.email;
    const sessionCustomer = verifyCustomerToken(token);
    if (sessionCustomer && sessionCustomer.email) {
      email = sessionCustomer.email;
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email or active session required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await query('SELECT id, name, email, phone, password, auth_provider, google_id FROM customers WHERE LOWER(email) = $1', [cleanEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer account not found' });
    }

    const row = result.rows[0];
    const isGoogleAuth = Boolean(row.auth_provider === 'google' || (row.google_id && row.google_id.length > 5));
    // If password starts with GOOGLE_AUTH_ or is empty, user hasn't set a custom password
    const hasCustomPassword = Boolean(row.password && !row.password.startsWith('GOOGLE_AUTH_') && row.password.length >= 4);

    res.json({
      success: true,
      email: row.email,
      maskedEmail: maskEmail(row.email),
      phone: row.phone || '',
      isGoogleAuth,
      hasCustomPassword
    });
  } catch (err) {
    console.error('Password status check error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/customer/change-password
router.post('/change-password', async (req, res) => {
  try {
    const token = (req.cookies && req.cookies.nachiyar_customer_token) ||
                  (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', '')) ||
                  req.headers['x-customer-token'];

    let email = req.body.email;
    const sessionCustomer = verifyCustomerToken(token);
    if (sessionCustomer && sessionCustomer.email) {
      email = sessionCustomer.email;
    }

    const { currentPassword, newPassword } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email or active session required.' });
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await query('SELECT id, name, email, password, auth_provider, google_id FROM customers WHERE LOWER(email) = $1', [cleanEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const row = result.rows[0];
    const isGoogleAuth = Boolean(row.auth_provider === 'google' || (row.google_id && row.google_id.length > 5));
    const hasCustomPassword = Boolean(row.password && !row.password.startsWith('GOOGLE_AUTH_') && row.password.length >= 4);

    // Current Password is ONLY required for MANUAL accounts (non-Google) that already have a password set.
    // Google logged-in users NEVER need to enter a current password!
    if (!isGoogleAuth && hasCustomPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required.' });
      }
      if (row.password !== currentPassword) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect. Please try again or use Forgot Password.' });
      }
    }

    // Update password in PostgreSQL
    await query('UPDATE customers SET password = $1 WHERE id = $2', [newPassword.trim(), row.id]);

    res.json({
      success: true,
      message: 'User password is updated successfully.'
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/customer/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const token = (req.cookies && req.cookies.nachiyar_customer_token) ||
                  (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', '')) ||
                  req.headers['x-customer-token'];

    let email = req.body.email;
    const sessionCustomer = verifyCustomerToken(token);
    if (sessionCustomer && sessionCustomer.email) {
      email = sessionCustomer.email;
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required to dispatch OTP.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await query('SELECT id, name, email FROM customers WHERE LOWER(email) = $1', [cleanEmail]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, notRegistered: true, message: 'This email is not registered with us. Please create an account first.' });
    }

    const customer = result.rows[0];

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(cleanEmail, { otp, expiresAt, customerId: customer.id, verified: false });

    // Send email via mailer
    const mailResult = await sendOtpEmail({
      to: cleanEmail,
      name: customer.name || 'Valued Customer',
      otp
    });

    res.json({
      success: true,
      message: 'Verification OTP has been sent to ' + cleanEmail,
      maskedEmail: maskEmail(cleanEmail),
      mailSent: mailResult.sent
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. POST /api/customer/verify-otp (Step 1 of reset: validates 6-digit code)
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = otpStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ success: false, message: 'No active OTP request found. Please click Send OTP first.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired (valid for 5 mins). Please request a new OTP.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'OTP is wrong. Please enter the valid OTP sent to your email.' });
    }

    // Mark as verified
    record.verified = true;
    res.json({
      success: true,
      message: 'OTP verified successfully! Please enter your new password below.'
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. POST /api/customer/verify-otp-reset (Step 2 of reset: sets new password after verified OTP)
router.post('/verify-otp-reset', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = otpStore.get(cleanEmail);

    if (!record) {
      return res.status(400).json({ success: false, message: 'No active OTP request found. Please click Send OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, message: 'OTP has expired (valid for 5 mins). Please request a new OTP.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'OTP is wrong. Please enter the valid OTP sent to your email.' });
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters.' });
    }

    await query('UPDATE customers SET password = $1 WHERE LOWER(email) = $2', [newPassword.trim(), cleanEmail]);
    otpStore.delete(cleanEmail);

    return res.json({
      success: true,
      message: 'User password is updated successfully.'
    });
  } catch (err) {
    console.error('Verify OTP reset error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
