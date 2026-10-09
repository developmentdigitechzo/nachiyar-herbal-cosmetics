const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../config/db');

// In-memory active session tokens: token -> { user, expiresAt }
const activeSessions = new Map();

// Default passwords for staff accounts (can be overridden via environment variables)
const DEFAULT_PASSWORDS = {
  admin: process.env.ADMIN_PASSWORD || 'admin123',
  inventory: process.env.INVENTORY_PASSWORD || 'inventory123',
  billing: process.env.BILLING_PASSWORD || 'billing123'
};

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyToken(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session.user;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const trimmedUser = username.trim().toLowerCase();
    const expectedPassword = DEFAULT_PASSWORDS[trimmedUser];

    if (!expectedPassword || expectedPassword !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Access denied.' });
    }

    // Query user profile from database
    const result = await query('SELECT * FROM users WHERE username = $1', [trimmedUser]);
    let user;
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || []);
      user = {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        permissions: permissions
      };
    } else {
      // Fallback default admin user
      user = {
        id: `user_${trimmedUser}`,
        username: trimmedUser,
        name: trimmedUser === 'admin' ? 'Super Administrator' : (trimmedUser === 'inventory' ? 'Inventory Manager' : 'Sales Staff'),
        role: trimmedUser === 'admin' ? 'super_admin' : (trimmedUser === 'inventory' ? 'inventory_manager' : 'sales_manager'),
        permissions: trimmedUser === 'admin' ? ['all'] : ['limited']
      };
    }

    // Generate token (expires in 24 hours)
    const token = generateToken();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    activeSessions.set(token, { user, expiresAt });

    // Set cookie for browser navigation authorization
    res.cookie('nachiyar_admin_token', token, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false, // accessible to client JS for api calls
      sameSite: 'lax',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Authentication successful',
      token: token,
      user: user
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ success: false, message: 'Internal server error during authentication' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const token = req.cookies?.nachiyar_admin_token || 
                req.headers['authorization']?.replace('Bearer ', '') || 
                req.headers['x-admin-token'] || 
                req.query.token;

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized session' });
  }

  res.json({ success: true, user: user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.cookies?.nachiyar_admin_token || 
                req.headers['authorization']?.replace('Bearer ', '') || 
                req.headers['x-admin-token'] || 
                req.body.token;

  if (token) {
    activeSessions.delete(token);
  }

  res.clearCookie('nachiyar_admin_token', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

// Middleware helper to protect admin API routes
function requireAdminAuth(req, res, next) {
  const token = req.cookies?.nachiyar_admin_token || 
                req.headers['authorization']?.replace('Bearer ', '') || 
                req.headers['x-admin-token'] || 
                req.query.token;

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. Administrative authorization required.' 
    });
  }

  req.adminUser = user;
  next();
}

module.exports = {
  router,
  verifyToken,
  requireAdminAuth
};
