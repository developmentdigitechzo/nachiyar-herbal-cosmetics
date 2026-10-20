const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { requireAdminAuth } = require('./auth');

// =========================================================================
// 1. PUBLIC: POST /api/messages (Submit contact inquiry from contact.html)
// =========================================================================
router.post('/', async (req, res) => {
  try {
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

    const createdMsg = result.rows[0];

    // Optional: link with customer record if exists in customers table
    try {
      const custCheck = await query('SELECT id FROM customers WHERE email = $1 OR (phone = $2 AND $2 != \'\')', [cleanEmail, cleanPhone]);
      if (custCheck.rows.length === 0 && cleanName) {
        // Create an inquiry lead customer if none exists
        const custId = 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await query(
          'INSERT INTO customers (id, name, email, phone, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) ON CONFLICT DO NOTHING',
          [custId, cleanName, cleanEmail, cleanPhone || null]
        );
      }
    } catch (custErr) {
      // Non-fatal if customers table has different constraint
    }

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
    const result = await query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    const rows = result.rows;
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
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const validStatuses = ['unread', 'read', 'resolved'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

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
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({
      success: true,
      message: 'Message status updated',
      data: result.rows[0]
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
    const result = await query('DELETE FROM contact_messages WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

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
