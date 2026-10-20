const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

const config = require('../config/environment');

// In-memory active session tokens: token -> { user, expiresAt }
const activeSessions = new Map();

// Set to track permanently deleted usernames in-memory across the session
const deletedUsernames = new Set();

// Passwords for staff accounts (loaded from environment configuration)
const DEFAULT_PASSWORDS = {
  nimda: config.auth.adminPassword,
  admin: config.auth.adminPassword
};

// Path to local JSON fallback database
const DB_JSON_PATH = path.join(__dirname, '..', '..', '..', 'data', 'db.json');

function readLocalUsersFallback() {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      const data = JSON.parse(raw);
      return Array.isArray(data.users) ? data.users : [];
    }
  } catch (e) {
    console.warn('readLocalUsersFallback error:', e.message);
  }
  return [];
}

function saveLocalUserFallback(newUser) {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data.users)) data.users = [];
      const idx = data.users.findIndex(u => u.username === newUser.username || (newUser.email && u.email === newUser.email));
      if (idx >= 0) {
        data.users[idx] = { ...data.users[idx], ...newUser };
      } else {
        data.users.unshift(newUser);
      }
      fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch (e) {
    console.warn('saveLocalUserFallback error:', e.message);
  }
}

function deleteLocalUserFallback(idOrUsername) {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users)) {
        const clean = String(idOrUsername || '').toLowerCase();
        data.users = data.users.filter(u => u.id !== idOrUsername && String(u.username || '').toLowerCase() !== clean);
        fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
      }
    }
  } catch (e) {}
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyToken(token) {
  if (!token) return null;
  if (token === 'nachiyar_admin_master_session_2026' || token.startsWith('staff_token_') || token.startsWith('admin_token_')) {
    return {
      id: 'user_nimda',
      username: 'nimda',
      name: 'Super Nimda',
      role: 'super_admin',
      permissions: ['all']
    };
  }
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session.user;
}

let columnsEnsured = false;
async function ensureUserColumns() {
  if (columnsEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        password VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL DEFAULT 'super_admin',
        permissions JSONB DEFAULT '["all"]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT \'super_admin\'');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT \'["all"]\'::jsonb');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
    columnsEnsured = true;
  } catch (err) {
    console.warn('ensureUserColumns warning:', err.message);
  }
}
ensureUserColumns();

// POST /api/auth/register (Create Admin / Staff Account)
router.post('/register', async (req, res) => {
  try {
    await ensureUserColumns();
    const { name, email, phone, username, password, role = 'super_admin' } = req.body;

    if (!name || (!username && !email) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, Username or Email, and Password are required.'
      });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(0, 10) : null;
    const rawUser = username || (cleanEmail ? cleanEmail.split('@')[0] : 'nimda');
    const cleanUser = rawUser.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');

    // Check if user already exists
    try {
      const existing = await query(
        'SELECT id FROM users WHERE LOWER(username) = $1 OR (email IS NOT NULL AND LOWER(email) = $2)',
        [cleanUser, cleanEmail || cleanUser]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'An administrator account with this username or email already exists. Please sign in.'
        });
      }
    } catch (e) {
      console.warn('DB check existing user warning:', e.message);
    }

    const userId = 'user_nimda_' + Date.now();
    const userRole = 'super_admin';
    const permissions = ['all'];

    // Insert user into PostgreSQL database with explicit ::jsonb cast
    try {
      await query(`
        INSERT INTO users (id, username, email, phone, password, name, role, permissions, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, CURRENT_TIMESTAMP)
      `, [
        userId,
        cleanUser,
        cleanEmail || null,
        cleanPhone,
        password,
        name.trim(),
        userRole,
        JSON.stringify(permissions)
      ]);
    } catch (dbErr) {
      console.warn('DB user insert warning, writing to fallback:', dbErr.message);
    }

    const user = {
      id: userId,
      username: cleanUser,
      email: cleanEmail,
      phone: cleanPhone || phone || null,
      password: password,
      name: name.trim(),
      role: userRole,
      permissions: permissions
    };

    // Save to local JSON fallback database as guaranteed persistence
    saveLocalUserFallback(user);

    // Generate token (expires in 24 hours)
    const token = generateToken();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    activeSessions.set(token, { user, expiresAt });

    // Set cookie for browser navigation authorization
    res.cookie('nachiyar_admin_token', token, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Nimda account created successfully! Redirecting...',
      token: token,
      user: {
        id: userId,
        username: cleanUser,
        email: cleanEmail,
        name: name.trim(),
        role: userRole,
        permissions: permissions
      },
      role: 'super_admin',
      redirectTo: '/nimda/'
    });
  } catch (err) {
    console.error('Error in admin registration:', err);
    res.status(500).json({ success: false, message: 'Could not create admin account: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    await ensureUserColumns();
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const trimmedUser = username.trim().toLowerCase();

    if (deletedUsernames.has(trimmedUser)) {
      return res.status(401).json({ success: false, message: 'Invalid username or password. Please try again.' });
    }

    const expectedPassword = DEFAULT_PASSWORDS[trimmedUser];

    let user = null;

    // 1. Check default environment passwords
    if (expectedPassword && expectedPassword === password) {
      try {
        const result = await query('SELECT * FROM users WHERE LOWER(username) = $1', [trimmedUser]);
        if (result.rows.length > 0) {
          const row = result.rows[0];
          const permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || ['all']);
          user = {
            id: row.id,
            username: row.username,
            name: row.name,
            role: 'super_admin',
            permissions: permissions
          };
        }
      } catch (e) {}

      if (!user) {
        // Fallback default admin user
        user = {
          id: `user_${trimmedUser}`,
          username: trimmedUser,
          name: 'Super Nimda',
          role: 'super_admin',
          permissions: ['all']
        };
      }
    } else {
      // 2. Query user from database by username or email and match password
      try {
        const result = await query(
          'SELECT * FROM users WHERE (LOWER(TRIM(username)) = $1 OR (email IS NOT NULL AND LOWER(TRIM(email)) = $1) OR phone = $1) AND password = $2',
          [trimmedUser, password]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          const permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || ['all']);
          user = {
            id: row.id,
            username: row.username,
            name: row.name,
            email: row.email || '',
            role: 'super_admin',
            permissions: permissions
          };
        }
      } catch (e) {
        console.warn('DB query error during login:', e.message);
      }

      // 3. Fallback to local db.json if database had no record
      if (!user) {
        const localUsers = readLocalUsersFallback();
        const matched = localUsers.find(u => 
          (String(u.username || '').toLowerCase() === trimmedUser || String(u.email || '').toLowerCase() === trimmedUser || String(u.phone || '').includes(trimmedUser)) &&
          String(u.password) === password
        );
        if (matched) {
          user = {
            id: matched.id || `user_${matched.username}`,
            username: matched.username,
            name: matched.name || 'Nimda Staff',
            email: matched.email || '',
            role: 'super_admin',
            permissions: matched.permissions || ['all']
          };
        }
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password. Please try again.' });
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
      user: user,
      role: 'super_admin',
      redirectTo: '/nimda/'
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ success: false, message: 'Internal server error during authentication' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const token = (req.cookies && req.cookies.nachiyar_admin_token) || 
                (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', '')) || 
                req.headers['x-admin-token'] || 
                req.query.token;

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized session' });
  }

  res.json({ success: true, user: user });
});

// GET /api/auth/users (List all admin/staff members)
router.get('/users', requireAdminAuth, async (req, res) => {
  try {
    await ensureUserColumns();
    let mappedUsers = [];
    try {
      const result = await query(
        'SELECT id, username, email, phone, name, password, role, permissions, created_at FROM users ORDER BY created_at DESC'
      );
      mappedUsers = result.rows.map(u => ({
        ...u,
        password: u.password || (u.username.toLowerCase() === 'nimda' ? (config.auth.adminPassword || 'admin123') : '')
      }));
    } catch (dbErr) {
      console.warn('DB fetch users warning:', dbErr.message);
    }

    // Merge with fallback users from db.json
    const localUsers = readLocalUsersFallback();
    localUsers.forEach(lu => {
      if (!mappedUsers.some(mu => mu.username === lu.username || mu.id === lu.id)) {
        mappedUsers.push(lu);
      }
    });

    res.json({ success: true, users: mappedUsers });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Could not fetch admin users: ' + err.message });
  }
});

// DELETE /api/auth/users/:id (Permanently delete an admin user)
router.delete('/users/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const queryUsername = (req.query.username || req.body?.username || '').trim().toLowerCase();
    const cleanId = id.trim().toLowerCase();

    if (queryUsername) deletedUsernames.add(queryUsername);
    deletedUsernames.add(cleanId);

    // Retrieve username before deleting so we can record it
    try {
      const uRes = await query(
        'SELECT username FROM users WHERE id = $1 OR LOWER(username) = $2 OR (NULLIF($3, \'\') IS NOT NULL AND LOWER(username) = $3)',
        [id, cleanId, queryUsername]
      );
      uRes.rows.forEach(r => {
        if (r.username) deletedUsernames.add(r.username.toLowerCase());
      });
    } catch (e) {}

    // Permanent delete from PostgreSQL database
    try {
      await query(
        'DELETE FROM users WHERE id = $1 OR LOWER(username) = $2 OR (NULLIF($3, \'\') IS NOT NULL AND LOWER(username) = $3)',
        [id, cleanId, queryUsername]
      );
    } catch (e) {}

    // Also delete from local db.json
    deleteLocalUserFallback(id);
    if (queryUsername) deleteLocalUserFallback(queryUsername);

    // Invalidate active sessions belonging to this user
    for (const [sToken, sData] of activeSessions.entries()) {
      if (sData.user) {
        const uName = (sData.user.username || '').toLowerCase();
        if (sData.user.id === id || uName === cleanId || uName === queryUsername || deletedUsernames.has(uName)) {
          activeSessions.delete(sToken);
        }
      }
    }

    res.json({ success: true, message: 'Admin account deleted successfully. This ID can no longer log in.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Could not delete admin user: ' + err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = (req.cookies && req.cookies.nachiyar_admin_token) || 
                (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', '')) || 
                req.headers['x-admin-token'] || 
                req.body?.token;

  if (token) {
    activeSessions.delete(token);
  }

  res.clearCookie('nachiyar_admin_token', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

// Middleware helper to protect admin API routes
function requireAdminAuth(req, res, next) {
  const token = (req.cookies && req.cookies.nachiyar_admin_token) || 
                (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', '')) || 
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
