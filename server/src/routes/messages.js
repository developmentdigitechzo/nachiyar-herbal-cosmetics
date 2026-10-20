const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const { requireAdminAuth } = require('./auth');

const DB_JSON_PATH = path.join(__dirname, '..', '..', '..', 'data', 'db.json');

function readLocalMessages() {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf-8'));
      return Array.isArray(data.contact_messages) ? data.contact_messages : [];
    }
  } catch (e) {}
  return [];
}

function saveLocalMessage(msg) {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf-8'));
      if (!Array.isArray(data.contact_messages)) data.contact_messages = [];
      const idx = data.contact_messages.findIndex(m => m.id === msg.id);
      if (idx >= 0) {
        data.contact_messages[idx] = { ...data.contact_messages[idx], ...msg };
      } else {
        data.contact_messages.unshift(msg);
      }
      fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }
  } catch (e) {}
}

let tableEnsured = false;
async function ensureContactMessagesTable() {
  if (tableEnsured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        subject VARCHAR(255) DEFAULT 'General Inquiry',
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'unread',
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_messages_status ON contact_messages (status);
    `);
    await query('ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS admin_notes TEXT');
    await query('ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS phone VARCHAR(50)');
    await query('ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS subject VARCHAR(255)');
    await query('ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
    tableEnsured = true;
  } catch (err) {
    console.warn('ensureContactMessagesTable warning:', err.message);
  }
}
ensureContactMessagesTable();

// =========================================================================
// 1. PUBLIC: POST /api/messages (Submit contact inquiry from contact.html)
// =========================================================================
router.post('/', async (req, res) => {
  try {
    await ensureContactMessagesTable();
    const { name, email, phone, subject, message } = req.body;
    const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, '').slice(0, 10) : '';

    if (!name || !email || !cleanPhone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, 10-digit mobile number, and message are required fields.'
      });
    }

    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanSubject = subject ? String(subject).trim() : 'General Inquiry';
    const cleanMessage = String(message).trim();

    let createdMsg = {
      id,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
      status: 'unread',
      admin_notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const insertSql = `
        INSERT INTO contact_messages (id, name, email, phone, subject, message, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'unread', NOW(), NOW())
        RETURNING *
      `;

      const result = await query(insertSql, [
        id,
        cleanName,
        cleanEmail,
        cleanPhone,
        cleanSubject,
        cleanMessage
      ]);
      if (result.rows.length > 0) createdMsg = result.rows[0];
    } catch (dbErr) {
      console.warn('DB insert contact_messages warning, writing fallback:', dbErr.message);
    }

    saveLocalMessage(createdMsg);

    res.status(201).json({
      success: true,
      message: 'Your message has been received with reverence. Our concierge desk will respond within 4 hours.',
      data: createdMsg
    });
  } catch (err) {
    console.error('Error submitting contact message:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting your message: ' + err.message
    });
  }
});

// =========================================================================
// 2. PROTECTED: GET /api/messages (Fetch all inquiries for Admin)
// =========================================================================
router.get('/', requireAdminAuth, async (req, res) => {
  try {
    await ensureContactMessagesTable();
    let rows = [];
    try {
      const result = await query('SELECT * FROM contact_messages ORDER BY created_at DESC');
      rows = result.rows;
    } catch (e) {
      console.warn('DB query contact_messages warning:', e.message);
    }

    // Merge with fallback
    const localMsgs = readLocalMessages();
    localMsgs.forEach(lm => {
      if (!rows.some(r => r.id === lm.id)) {
        rows.push(lm);
      }
    });

    const unreadCount = rows.filter(m => m.status === 'unread').length;

    res.json({
      success: true,
      data: rows,
      totalCount: rows.length,
      unreadCount
    });
  } catch (err) {
    console.error('Error fetching contact messages:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages: ' + err.message
    });
  }
});

// =========================================================================
// 3. PROTECTED: PATCH /api/messages/:id/status (Mark read, resolved, etc.)
// =========================================================================
router.patch('/:id/status', requireAdminAuth, async (req, res) => {
  try {
    await ensureContactMessagesTable();
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const validStatuses = ['unread', 'read', 'resolved'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    let updatedRow = null;

    try {
      const updates = [];
      const values = [];
      let idx = 1;

      if (status) {
        updates.push(`status = $${idx++}`);
        values.push(status);
      }
      if (admin_notes !== undefined) {
        updates.push(`admin_notes = $${idx++}`);
        values.push(admin_notes);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const updateSql = `
        UPDATE contact_messages
        SET ${updates.join(', ')}
        WHERE id = $${idx}
        RETURNING *
      `;

      const result = await query(updateSql, values);
      if (result.rows.length > 0) {
        updatedRow = result.rows[0];
      }
    } catch (dbErr) {
      console.warn('DB update message warning, falling back:', dbErr.message);
    }

    // Update fallback record
    const localMsgs = readLocalMessages();
    const target = localMsgs.find(m => m.id === id);
    if (target) {
      if (status) target.status = status;
      if (admin_notes !== undefined) target.admin_notes = admin_notes;
      target.updated_at = new Date().toISOString();
      saveLocalMessage(target);
      if (!updatedRow) updatedRow = target;
    }

    res.json({
      success: true,
      message: 'Message status updated',
      data: updatedRow || { id, status: status || 'resolved', admin_notes: admin_notes || '' }
    });
  } catch (err) {
    console.error('Error updating message status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update message: ' + err.message
    });
  }
});

// =========================================================================
// 4. PROTECTED: DELETE /api/messages/:id (Delete inquiry)
// =========================================================================
router.delete('/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await query('DELETE FROM contact_messages WHERE id = $1', [id]);
    } catch (e) {}

    try {
      if (fs.existsSync(DB_JSON_PATH)) {
        const data = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf-8'));
        if (Array.isArray(data.contact_messages)) {
          data.contact_messages = data.contact_messages.filter(m => m.id !== id);
          fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
        }
      }
    } catch (e) {}

    res.json({
      success: true,
      message: 'Inquiry message deleted successfully',
      id
    });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message: ' + err.message
    });
  }
});

module.exports = router;
